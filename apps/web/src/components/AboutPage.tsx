import { Mermaid } from "@repo/ui/mermaid";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const ARCHITECTURE_DIAGRAM = `graph TD
    User["User (Browser)"]
    Web["Frontend\\nReact + Vite\\nFirebase Hosting"]
    API["Backend\\nFastify\\nCloud Run"]
    Gemini["Google Gemini API"]
    Resume["resume.md\\n(system prompt)"]
    Firestore["Firestore\\n(session history)"]

    User -->|"types a message"| Web
    Web -->|"GET /session (on load)"| API
    Web -->|"POST /chat (message)"| API
    API -->|"read/write history"| Firestore
    Resume -->|"injected as system prompt"| API
    API -->|"generateContentStream"| Gemini
    Gemini -->|"streamed chunks"| API
    API -->|"SSE events (data: json)"| Web
    Web -->|"rendered markdown"| User`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function AboutPage() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto max-w-2xl w-full mx-auto p-4 gap-6">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to chat
      </Link>

      <Section title="What is this thing?">
        <p>
          Nobody actually reads resumes cover to cover, so Aaron built one you can interrogate
          instead. Ask it whatever you'd normally ask a candidate — it'll answer in real time,
          grounded in his actual work history, and (mostly) won't make anything up.
        </p>

        <p>
          Is it useful? Probably not.
          <br />
          Was it fun to make? Yes, yes it was.
        </p>
      </Section>

      <Section title="How it works">
        <p>
          Aaron's resume gets shoved into Google's Gemini 2.5 Flash as a system prompt, then the
          model is told, sternly, to stick to the facts and not wander off into being a
          general-purpose chatbot.
        </p>
        <ol className="list-decimal list-inside flex flex-col gap-1">
          <li>Your browser opens a session and grabs any history you left behind</li>
          <li>Your question hits the API, which streams the model's answer back word by word</li>
          <li>That answer renders live as markdown, typing-indicator and all</li>
          <li>The whole conversation gets saved, so you can walk away and pick it back up</li>
        </ol>
      </Section>

      <Section title="Architecture (the fun kind)">
        <p>A tidy little monorepo, three parts pretending to be one app:</p>

        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>
            <span className="font-medium text-foreground">apps/web</span> — the chat UI you're
            looking at, living on Firebase Hosting
          </li>
          <li>
            <span className="font-medium text-foreground">apps/api</span> — the Fastify brain,
            running on Google Cloud Run
          </li>
          <li>
            <span className="font-medium text-foreground">packages/types</span> — the shared
            TypeScript contract keeping the other two honest
          </li>
          <li>
            <span className="font-medium text-foreground">packages/ui</span> — the shared,
            Shadcn-flavoured components
          </li>
        </ul>
        <p>
          A cookie remembers who you are and Firestore remembers what you said, so no login and no
          amnesia between visits.
        </p>
      </Section>

      <Section title="Architecture Diagrams (Some boxes with lines between them)">
        <Mermaid
          chart={ARCHITECTURE_DIAGRAM}
          config={{ theme: "neutral", fontFamily: "inherit", flowchart: { htmlLabels: false } }}
          className="rounded-lg border bg-background p-4"
        />
      </Section>

      <Section title="Under the hood">
        <ul className="list-disc list-inside flex flex-col gap-1">
          <li>React 19 + Vite, dressed up with Tailwind CSS</li>
          <li>TanStack Query doing the unglamorous job of caching chat state</li>
          <li>Fastify v5, streaming answers over Server-Sent Events</li>
          <li>Google Gemini 2.5 Flash doing the actual thinking</li>
          <li>Firestore quietly remembering every conversation</li>
          <li>Turborepo + pnpm workspaces holding the monorepo together</li>
          <li>Vitest, Testing Library and Biome keeping everyone honest</li>
          <li>Shipped via Firebase Hosting and GCP Cloud Run</li>
        </ul>
      </Section>

      <Section title="CI/CD (robots doing Aaron's job)">
        <p>
          Every push to main gets lint, type-check, tests, and a build thrown at it by GitHub
          Actions. If it survives, a second workflow builds the API into a container, ships it to
          Cloud Run, then builds and deploys the frontend to Firebase Hosting — no human required,
          no deploy-day anxiety, no "it works on my machine."
        </p>
      </Section>
    </div>
  );
}
