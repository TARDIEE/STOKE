import Image from "next/image";
import { experience, tools } from "@/lib/content";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";

export default function About() {
  return (
    <Reveal id="about" className="mx-auto max-w-7xl px-4 py-28 sm:px-8 sm:py-40">
      <SectionHead
        index="03"
        label="About"
        title={<>Hi, I&apos;m Krish — I make people <em className="font-display font-normal italic">stay.</em></>}
      />

      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <div data-reveal className="tilt-card tilt-flat relative aspect-[4/5] overflow-hidden rounded-2xl md:col-span-5">
          <Image src="/images/krish-profile.jpeg" alt="Krish Mandal" fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover" />
        </div>

        <div className="flex flex-col gap-10 md:col-span-6 md:col-start-7">
          <p data-reveal className="text-2xl leading-snug tracking-tight sm:text-3xl">
            I turn raw footage and ideas into clean, engaging content. My approach is simple:
            understand the message, remove what doesn&apos;t matter, and shape the important parts
            into something people <span className="text-ink-500">actually want to watch.</span>
          </p>

          <div data-reveal className="border-t border-line pt-6">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-500">Experience</p>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-lg font-semibold">{experience.company}</p>
              <p className="font-mono text-xs text-ink-500">{experience.duration}</p>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <p className="text-lg font-semibold">Freelance — creators &amp; brands</p>
              <p className="font-mono text-xs text-ink-500">Present</p>
            </div>
          </div>

          <div data-reveal className="border-t border-line pt-6">
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-500">Toolkit</p>
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <span key={t.name} className="magnetic rounded-full border border-line px-4 py-2 text-sm">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
