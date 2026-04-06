"use client";

import { useState } from "react";
import { ChevronRight, MessageCircle, SkipForward } from "lucide-react";

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
  const [currentStep, setCurrentStep] = useState(0);

  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;
  const currentAnswer = answers[`q${currentStep}`] ?? "";

  const handleSuggestedAnswerClick = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q${currentStep}`]: answer,
    }));
  };

  const handleCustomAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q${currentStep}`]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleSubmit = () => {
    const formattedAnswers: Record<string, string> = {};
    questions.forEach((q, i) => {
      formattedAnswers[q.question] = answers[`q${i}`] ?? "";
    });
    onSubmit(formattedAnswers);
  };

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

      {/* Progress indicator */}
      <div className="mb-4 flex items-center gap-1">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index < currentStep
                ? "bg-[var(--accent)]"
                : index === currentStep
                  ? "bg-[var(--accent)]/50"
                  : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-[var(--muted)] mb-3">
        Question {currentStep + 1} of {questions.length}
      </p>

      <div className="space-y-3">
        <p className="text-base font-medium text-[var(--foreground)]">
          {currentQuestion.question}
        </p>

        {currentQuestion.suggestedAnswers &&
          currentQuestion.suggestedAnswers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.suggestedAnswers.map((answer, answerIndex) => (
                <button
                  key={answerIndex}
                  type="button"
                  onClick={() => handleSuggestedAnswerClick(answer)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    currentAnswer === answer
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
          value={currentAnswer}
          onChange={(e) => handleCustomAnswerChange(e.target.value)}
          placeholder="Type your answer or select from suggestions above..."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" />
          Skip
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-50"
          >
            Submit All Answers
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
