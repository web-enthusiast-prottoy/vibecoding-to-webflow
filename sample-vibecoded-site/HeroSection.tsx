import React from 'react';

export default function HeroSection() {
  return (
    <section className="w-full bg-white px-4 py-16 md:py-24">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
          Convert Code to Webflow
        </h1>
        <p className="max-w-2xl text-lg text-gray-600 mb-8">
          The fastest way to take your generated React designs and turn them into 
          native Webflow projects using Client-First principles.
        </p>
        <div className="flex gap-4">
          <a href="#" className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            Get Started
          </a>
          <a href="#" className="rounded-md bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-200">
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
