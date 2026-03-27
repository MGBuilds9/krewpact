'use client';

import { useForm } from 'react-hook-form';

import type { SurveySubmission } from '@/lib/validators/portal-survey';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

type SurveySetValue = ReturnType<typeof useForm<SurveySubmission>>['setValue'];
type SurveyErrors = ReturnType<typeof useForm<SurveySubmission>>['formState']['errors'];

export function StarRating({
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

interface RatingsGridProps {
  overallRating: number;
  commRating: number;
  qualityRating: number;
  scheduleRating: number;
  errors: SurveyErrors;
  setValue: SurveySetValue;
}

export function RatingsGrid({
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

export function RecommendationField({
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

export interface SurveyFormProps {
  register: ReturnType<typeof useForm<SurveySubmission>>['register'];
  handleSubmit: ReturnType<typeof useForm<SurveySubmission>>['handleSubmit'];
  onSubmit: (data: SurveySubmission) => Promise<void>;
  errors: SurveyErrors;
  isSubmitting: boolean;
  overallRating: number;
  commRating: number;
  qualityRating: number;
  scheduleRating: number;
  wouldRecommend: boolean;
  setValue: SurveySetValue;
  submitError: string | null;
  isUpdate: boolean;
}

export function SurveyForm({
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
