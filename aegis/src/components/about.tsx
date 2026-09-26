import { Eyebrow, Panel } from "./ui";

const FACTS = [
  {
    title: "The triple",
    body: "Every turn is input, a required reasoning trace, and the output. Aegis captures all three before anything is released.",
  },
  {
    title: "The judge",
    body: "Jev scores the triple against the EU AI Act: prohibited practices, Annex III credit risk, grounding, discrimination, personal data, and human oversight.",
  },
  {
    title: "The gate",
    body: "ALLOW releases the output. FLAG releases it and marks it for a person. BLOCK withholds it. The raw output is still stored.",
  },
  {
    title: "The ledger",
    body: "Each decision is appended to a local SQLite chain. The hash covers the previous row, so a changed record breaks the chain.",
  },
];

export function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Eyebrow>About</Eyebrow>
        <h2 className="mt-2 font-serif text-[40px] leading-none text-white">Runtime governance for agents.</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-mist">
          Aegis wraps an agent the way a gate wraps a decision. The agent can still think. It cannot ship an answer
          that fails the policy. This console is the proof, built for JEVATHON.
        </p>
      </div>

      <Panel className="p-5">
        <Eyebrow>The AI Collective</Eyebrow>
        <p className="mt-3 font-serif text-[26px] leading-snug text-white">
          If you want to meet the team, meet us at the Luma event.
        </p>
        <a
          href="https://lu.ma/aic-jev"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-[13px] text-signal"
        >
          JEVATHON on Luma
        </a>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        {FACTS.map((fact) => (
          <Panel key={fact.title} className="p-5">
            <h3 className="text-[15px] font-medium text-white">{fact.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-fog">{fact.body}</p>
          </Panel>
        ))}
      </div>

      <Panel className="p-5">
        <Eyebrow>The agent under test</Eyebrow>
        <p className="mt-3 text-[14px] leading-7 text-mist">
          The Loan Approval agent is the reference. Ask about Ram Guttikonda and it retrieves his file with LlamaIndex,
          calculates a FICO-shaped score from that file, checks the prime rate through Browserbase, and emails the
          decision through Photon. Aegis judges the turn either way. It is a demo of governance, not a lender and not a
          legal certification under the EU AI Act.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-[13px]">
          <a href="#playground" className="text-signal">
            Open the playground
          </a>
          <a href="#ledger" className="text-signal">
            Read the ledger
          </a>
          <a href="#feedback" className="text-signal">
            Leave community feedback
          </a>
          <a href="#subscribe" className="text-signal">
            See subscription plans
          </a>
        </div>
      </Panel>
    </div>
  );
}
