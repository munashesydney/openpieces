"use client";

import { useState } from "react";
import { MessageCircle, SendHorizonal } from "lucide-react";

type Question = {
  question: string;
  suggestedAnswers?: string[];
};

type QuestionInputCardProps = {
  toolCallId: string;
  questions: Question[];
  isPending: boolean;
  onSubmit: (answers: Record<string, string>) => void;
};

export function QuestionInputCard({
  toolCallId,
  questions,
  isPending,
  onSubmit,
}: QuestionInputCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSuggestedAnswerClick = (questionIndex: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q${questionIndex}`]: answer,
    }));
  };

  const handleCustomAnswerChange = (questionIndex: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q${questionIndex}`]: value,
    }));
  };

  const handleSubmit = () => {
    const formattedAnswers: Record<string, string> = {};
    questions.forEach((q, i) => {
      formattedAnswers[q.question] = answers[`q${i}`] ?? "";
    });
    onSubmit(formattedAnswers);
  };

  const allAnswered = questions.every((_, i) => answers[`q${i}`]?.trim());

  return (
    <div className="rounded-xl border border-[var(--accent)] bg-[var(--sidebar-bg)] px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-md border border-[var(--accent)] bg-[var(--accent)]/10 p-1.5">
          <MessageCircle className="h-3.5 w-3.5 text-[var(--accent)]" />
        </div>
        <p className="text-sm font-medium text-[var(--foreground)]">Questions from AI</p>
        {isPending && (
          <span className="ml-auto text-xs text-[var(--muted)]">Waiting for response...</span>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, questionIndex) => (
          <div key={questionIndex} className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">{q.question}</p>

            {q.suggestedAnswers && q.suggestedAnswers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {q.suggestedAnswers.map((answer, answerIndex) => (
                  <button
                    key={answerIndex}
                    type="button"
                    onClick={() => handleSuggestedAnswerClick(questionIndex, answer)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      answers[`q${questionIndex}`] === answer
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--bg)] text-[var(--foreground)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {answer}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={answers[`q${questionIndex}`] ?? ""}
              onChange={(e) => handleCustomAnswerChange(questionIndex, e.target.value)}
              placeholder="Type your answer..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || isPending}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            allAnswered && !isPending
              ? "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90"
              : "bg-[var(--hover-bg)] text-[var(--muted)] cursor-not-allowed"
          }`}
        >
          <SendHorizonal className="h-4 w-4" />
          Submit Answers
        </button>
      </div>
    </div>
  );
}
