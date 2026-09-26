import { BaseEmbedding, Document, Settings, VectorStoreIndex } from "llamaindex";
import { CUSTOMERS, ensureCustomers, renderCustomer, type Customer } from "./book";
import { calculateFico, type FicoResult } from "./fico";

export type CustomerFile = Customer & {
  fico: FicoResult;
  retrievedBy: "llamaindex";
  score: number | null;
};

const DIMS = 64;

/** Local bag-of-tokens embedding so the index does not call out to an API. */
class BookEmbedding extends BaseEmbedding {
  constructor() {
    super();
    this.embedBatchSize = 32;
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const vec = new Array<number>(DIMS).fill(0);
    for (const token of text.toLowerCase().split(/[^a-z0-9@.]+/)) {
      if (token.length < 2) continue;
      let hash = 2166136261;
      for (let i = 0; i < token.length; i += 1) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      vec[(hash >>> 0) % DIMS] += token.length > 3 ? 1.4 : 1;
    }
    const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vec.map((value) => value / norm);
  }
}

type Global = typeof globalThis & { __aegisCustomerIndex?: VectorStoreIndex };

async function getIndex() {
  const g = globalThis as Global;
  if (!g.__aegisCustomerIndex) {
    ensureCustomers();
    Settings.embedModel = new BookEmbedding();
    const documents = CUSTOMERS.map(
      (customer) =>
        new Document({
          text: renderCustomer(customer),
          id_: customer.id,
          metadata: { customerId: customer.id },
        }),
    );
    g.__aegisCustomerIndex = await VectorStoreIndex.fromDocuments(documents);
  }
  return g.__aegisCustomerIndex;
}

function mentioned(customer: Customer, query: string) {
  const text = query.toLowerCase();
  const [first, last] = customer.name.toLowerCase().split(" ");
  const firstHit = first ? new RegExp(`\\b${first}\\b`).test(text) : false;
  const lastHit = last ? new RegExp(`\\b${last}\\b`).test(text) : false;
  return { firstHit, lastHit, both: firstHit && lastHit };
}

/**
 * Retrieve the customer file LlamaIndex ranks highest for this query.
 * A full-name mention wins over a partial one, so "Ram" does not collapse into "Rama" or "Ramesh".
 */
export async function lookupCustomer(query: string): Promise<CustomerFile | null> {
  const named = CUSTOMERS.map((customer) => ({ customer, ...mentioned(customer, query) })).filter(
    (hit) => hit.firstHit || hit.lastHit,
  );
  const exact = named.find((hit) => hit.both) ?? named.find((hit) => hit.firstHit);
  if (!named.length && !/\b(customer|applicant|loan|fico|approve|deny)\b/i.test(query)) {
    return null;
  }

  const index = await getIndex();
  const [top] = await index.asRetriever({ similarityTopK: 1 }).retrieve({ query });
  const retrievedId = top?.node.metadata?.customerId;
  const retrieved = CUSTOMERS.find((customer) => customer.id === retrievedId) ?? null;
  const customer = exact?.customer ?? (named.length === 1 ? named[0].customer : retrieved);
  if (!customer) return null;

  return {
    ...customer,
    fico: calculateFico(customer),
    retrievedBy: "llamaindex",
    score: typeof top?.score === "number" ? top.score : null,
  };
}
