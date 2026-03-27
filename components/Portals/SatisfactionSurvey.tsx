'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { type SurveySubmission, surveySubmissionSchema } from '@/lib/validators/portal-survey';

import { SurveyForm } from './SurveyFormFields';

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

  const formProps = {
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
  };

  if (existingSurvey) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-blue-800 text-sm font-medium">
            Survey submitted on {new Date(existingSurvey.submitted_at).toLocaleDateString('en-CA')}.
            You can update your response below.
          </p>
        </div>
        <SurveyForm {...formProps} isUpdate />
      </div>
    );
  }

  return <SurveyForm {...formProps} isUpdate={false} />;
}
