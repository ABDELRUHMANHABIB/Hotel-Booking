import { useState } from "react";
import { readApiResponse } from "../utils/api";

function StayInspired() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await readApiResponse(response);

      setMessage(
        result.alreadySubscribed
          ? "This email is already subscribed."
          : "You're subscribed! Your email has been added to the QuickStay subscriber list.",
      );
      setEmail("");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white px-5 py-14 sm:px-8 sm:py-16 lg:px-16">
      <div className="mx-auto max-w-6xl rounded-2xl bg-slate-950 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
        <p className="mb-2 text-sm font-medium text-blue-300">
          A little inspiration for your next escape
        </p>
        <h2 className="font-playfair text-3xl font-semibold sm:text-4xl">
          Stay Inspired
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
          Sign up for travel ideas, handpicked stays, and exclusive offers
          delivered straight to your inbox.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-7 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-300/40"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p
          className={`mt-4 min-h-5 text-sm ${
            isError ? "text-red-300" : "text-emerald-300"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Sign up for thoughtful travel inspiration and exclusive QuickStay
          offers.
        </p>
      </div>
    </section>
  );
}

export default StayInspired;
