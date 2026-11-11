"use client";

import { useState, type FormEvent } from "react";
import { MAX_FEEDBACK_MESSAGE_LENGTH } from "../lib/feedback";

type FeedbackResponse = {
  success?: boolean;
  error?: string;
};

export default function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasSuccessful, setWasSuccessful] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");
    setWasSuccessful(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.get("category"),
          area: formData.get("area"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });
      const data = (await response.json()) as FeedbackResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Feedback could not be sent.");
      }

      form.reset();
      setMessage("");
      setWasSuccessful(true);
      setStatus("Thank you. Your anonymous feedback was sent.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Feedback could not be sent. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="feedback-category" className="text-sm font-semibold">
            What kind of feedback?
          </label>
          <select
            id="feedback-category"
            name="category"
            required
            defaultValue="bug"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
          >
            <option value="bug">Something is broken</option>
            <option value="idea">Feature idea</option>
            <option value="confusing">Something is confusing</option>
            <option value="other">Other feedback</option>
          </select>
        </div>

        <div>
          <label htmlFor="feedback-area" className="text-sm font-semibold">
            Which part of PricePeek?
          </label>
          <select
            id="feedback-area"
            name="area"
            required
            defaultValue="tracking"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
          >
            <option value="tracking">Adding or tracking products</option>
            <option value="prices">Prices and history</option>
            <option value="notifications">Notifications</option>
            <option value="installation">Installing the app</option>
            <option value="account">Sign-in and account</option>
            <option value="billing">Plans and billing</option>
            <option value="other">Another area</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="feedback-message" className="text-sm font-semibold">
            What happened, or what should improve?
          </label>
          <span className="text-xs text-slate-500" aria-live="polite">
            {message.length}/{MAX_FEEDBACK_MESSAGE_LENGTH}
          </span>
        </div>
        <textarea
          id="feedback-message"
          name="message"
          required
          minLength={20}
          maxLength={MAX_FEEDBACK_MESSAGE_LENGTH}
          rows={7}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Describe the steps you took and what you expected."
          className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
        />
      </div>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="feedback-website">Leave this field empty</label>
        <input
          id="feedback-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        Do not include your email, Amazon links, payment details, passwords,
        sign-in links, or API keys. Feedback is anonymous, so PricePeek cannot
        reply to or identify your submission.
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-green-400 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
      >
        {isSubmitting ? "Sending…" : "Send anonymous feedback"}
      </button>

      {status ? (
        <p
          role="status"
          className={`text-sm ${wasSuccessful ? "text-green-300" : "text-amber-300"}`}
        >
          {status}
        </p>
      ) : null}
    </form>
  );
}
