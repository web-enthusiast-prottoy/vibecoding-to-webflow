"use client";

import "./page.css";

// Import DevLink components from "@/webflow/*"
// import { ComponentName } from "@/webflow/ComponentName";

export default function Home() {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Webflow Cloud</h1>
          <p className="hero-description">
            Your Next.js project is ready. Start building and sync your Webflow
            components and design system.
          </p>
          <div className="hero-cta">
            <a
              href="https://developers.webflow.com/data-clients/docs/getting-started"
              className="button-primary"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
