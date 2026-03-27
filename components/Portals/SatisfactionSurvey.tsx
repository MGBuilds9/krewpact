'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { type SurveySubmission, surveySubmissionSchema } from '@/lib/validators/portal-survey';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

function StarRating({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={RATING_LABELS[star]}
            aria-pressed={value === star}
            className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${
              value >= star
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-400 hover:border-blue-400'
            }`}
          >
            {star}
          </button>
        ))}
      </div>
      {value > 0 && <p className="text-xs text-gray-500">{RATING_LABELS[value]}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

interface SatisfactionSurveyProps {
  projectId: string;
  existingSurvey?: {
    overall_rating: number;
    communication_rating: number;
    quality_rating: number;
    schedule_rating: number;
    comments: string | null;
    would_recommend: boolean;
    submitted_at: string;
  } | null;
  onSubmitted?: () => void;
}

type ExistingSurveyData = SatisfactionSurveyProps['existingSurvey'];

function buildDefaultValues(existingSurvey: ExistingSurveyData): SurveySubmission {
  if (existingSurvey) {
    return {
      overall_rating: existingSurvey.overall_rating,
      communication_rating: existingSurvey.communication_rating,
      quality_rating: existingSurvey.quality_rating,
      schedule_rating: existingSurvey.schedule_rating,
      comments: existingSurvey.comments ?? '',
      would_recommend: existingSurvey.would_recommend,
    };
  }
  return {
    overall_rating: 0,
    communication_rating: 0,
    quality_rating: 0,
    schedule_rating: 0,
    comments: '',
    would_recommend: true,
  };
}

export function SatisfactionSurvey({
  projectId,
  existingSurvey,
  onSubmitted,
}: SatisfactionSurveyProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SurveySubmission>({
    resolver: zodResolver(surveySubmissionSchema),
    defaultValues: buildDefaultValues(existingSurvey),
  });

  const overallRating = watch('overall_rating');
  const commRating = watch('communication_rating');
  const qualityRating = watch('quality_rating');
  const scheduleRating = watch('schedule_rating');
  const wouldRecommend = watch('would_recommend');

  async function onSubmit(data: SurveySubmission) {
    setSubmitError(null);
    try {
      const res = await fetch(`/api/portal/projects/${projectId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Submission failed');
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-1">Thank you for your feedback!</p>
        <p className="text-green-700 text-sm">Your survey response has been recorded.</p>
      </div>
    );
  }

  if (existingSurvey && !submitted) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-blue-800 text-sm font-medium">
            Survey submitted on {new Date(existingSurvey.submitted_at).toLocaleDateString('en-CA')}.
            You can update your response below.
          </p>
        </div>
        <SurveyForm
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          errors={errors}
          isSubmitting={isSubmitting}
          overallRating={overallRating}
          commRating={commRating}
          qualityRating={qualityRating}
          scheduleRating={scheduleRating}
          wouldRecommend={wouldRecommend}
          setValue={setValue}
          submitError={submitError}
          isUpdate
        />
      </div>
    );
  }

  return (
    <SurveyForm
      register={register}
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      errors={errors}
      isSubmitting={isSubmitting}
      overallRating={overallRating}
      commRating={commRating}
      qualityRating={qualityRating}
      scheduleRating={scheduleRating}
      wouldRecommend={wouldRecommend}
      setValue={setValue}
      submitError={submitError}
      isUpdate={false}
    />
  );
}

interface SurveyFormProps {
  register: ReturnType<typeof useForm<SurveySubmission>>['register'];
  handleSubmit: ReturnType<typeof useForm<SurveySubmission>>['handleSubmit'];
  onSubmit: (data: SurveySubmission) => Promise<void>;
  errors: ReturnType<typeof useForm<SurveySubmission>>['formState']['errors'];
  isSubmitting: boolean;
  overallRating: number;
  commRating: number;
  qualityRating: number;
  scheduleRating: number;
  wouldRecommend: boolean;
  setValue: ReturnType<typeof useForm<SurveySubmission>>['setValue'];
  submitError: string | null;
  isUpdate: boolean;
}

type SurveySetValue = ReturnType<typeof useForm<SurveySubmission>>['setValue'];
type SurveyErrors = ReturnType<typeof useForm<SurveySubmission>>['formState']['errors'];

interface RatingsGridProps {
  overallRating: number;
  commRating: number;
  qualityRating: number;
  scheduleRating: number;
  errors: SurveyErrors;
  setValue: SurveySetValue;
}
function RatingsGrid({
  overallRating,
  commRating,
  qualityRating,
  scheduleRating,
  errors,
  setValue,
}: RatingsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <StarRating
        label="Overall Satisfaction"
        name="overall_rating"
        value={overallRating}
        onChange={(v) => setValue('overall_rating', v, { shouldValidate: true })}
        error={errors.overall_rating?.message}
      />
      <StarRating
        label="Communication"
        name="communication_rating"
        value={commRating}
        onChange={(v) => setValue('communication_rating', v, { shouldValidate: true })}
        error={errors.communication_rating?.message}
      />
      <StarRating
        label="Quality of Work"
        name="quality_rating"
        value={qualityRating}
        onChange={(v) => setValue('quality_rating', v, { shouldValidate: true })}
        error={errors.quality_rating?.message}
      />
      <StarRating
        label="Schedule Adherence"
        name="schedule_rating"
        value={scheduleRating}
        onChange={(v) => setValue('schedule_rating', v, { shouldValidate: true })}
        error={errors.schedule_rating?.message}
      />
    </div>
  );
}

function RecommendationField({
  wouldRecommend,
  setValue,
}: {
  wouldRecommend: boolean;
  setValue: SurveySetValue;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">Would you recommend us?</label>
      <div className="flex gap-3">
        {[true, false].map((val) => (
          <button
            key={String(val)}
            type="button"
            onClick={() => setValue('would_recommend', val, { shouldValidate: true })}
            aria-pressed={wouldRecommend === val}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${wouldRecommend === val ? (val ? 'bg-green-600 border-green-600 text-white' : 'bg-red-500 border-red-500 text-white') : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}
          >
            {val ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

function SurveyForm({
  register,
  handleSubmit,
  onSubmit,
  errors,
  isSubmitting,
  overallRating,
  commRating,
  qualityRating,
  scheduleRating,
  wouldRecommend,
  setValue,
  submitError,
  isUpdate,
}: SurveyFormProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <RatingsGrid
        overallRating={overallRating}
        commRating={commRating}
        qualityRating={qualityRating}
        scheduleRating={scheduleRating}
        errors={errors}
        setValue={setValue}
      />
      <RecommendationField wouldRecommend={wouldRecommend} setValue={setValue} />
      <div className="space-y-1">
        <label htmlFor="survey-comments" className="block text-sm font-medium text-gray-700">
          Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="survey-comments"
          {...register('comments')}
          rows={4}
          placeholder="Share any additional thoughts..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        {errors.comments && <p className="text-xs text-red-600">{errors.comments.message}</p>}
      </div>
      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : isUpdate ? 'Update Response' : 'Submit Survey'}
        </button>
      </div>
    </form>
  );
}
