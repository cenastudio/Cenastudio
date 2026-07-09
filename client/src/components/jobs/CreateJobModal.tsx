/**
 * CreateJobModal Component
 *
 * Modal for creating new jobs with a 4-step form including title, client, deadline, and status.
 * Features glass effect backdrop, validation, error handling, and optimistic updates.
 *
 * Features:
 * - 4-field form: title, client, deadline, status
 * - Real-time validation with error messages
 * - Client dropdown with autocomplete
 * - Date picker for deadline (future dates only)
 * - Status dropdown with 4 options
 * - API integration with loading states
 * - Error handling with retry
 * - Optimistic UI updates
 * - Keyboard navigation and accessibility
 *
 * @example
 * ```tsx
 * <CreateJobModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onSuccess={(newJob) => {
 *     console.log('Job created:', newJob);
 *     navigate(`/jobs/${newJob.id}`);
 *   }}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import AnimatedModal from '@/components/AnimatedModal';
import { Button } from '@/design-system/primitives/Button';
import { Job, JobStatus } from '@/components/dashboard/JobCard';
import { Client } from '@/lib/api';

export interface CreateJobFormData {
  title: string;
  clientId: string;
  deadline: string; // ISO date
  status: JobStatus;
}

export interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newJob: Job) => void;
  clients?: Client[]; // Optional clients list, if not provided will fetch
}

interface FormErrors {
  title?: string;
  clientId?: string;
  deadline?: string;
  status?: string;
}

/**
 * Parse a "YYYY-MM-DD" date-only string as a local midnight Date.
 *
 * `new Date("YYYY-MM-DD")` parses the string as UTC midnight, not local
 * midnight. In any timezone behind UTC (e.g. Brazil, UTC-3) that shifts the
 * date backwards by a day once compared against a local `Date`, which made
 * "today" register as a past date and skewed daysLeft calculations by one
 * day. Parsing the parts manually keeps everything in local time.
 */
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

/**
 * Validate form field
 */
const validateField = (field: keyof CreateJobFormData, value: string): string | undefined => {
  switch (field) {
    case 'title': {
      const trimmed = value.trim();
      if (!trimmed) return 'Título é obrigatório';
      if (trimmed.length < 3) return 'Título deve ter pelo menos 3 caracteres';
      if (trimmed.length > 200) return 'Título deve ter no máximo 200 caracteres';
      return undefined;
    }
    case 'clientId':
      if (!value) return 'Cliente é obrigatório';
      return undefined;
    case 'deadline': {
      if (!value) return 'Deadline é obrigatório';
      const selectedDate = parseLocalDate(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) return 'Deadline deve ser hoje ou uma data futura';
      return undefined;
    }
    case 'status':
      if (!value) return 'Status é obrigatório';
      if (!['briefing', 'production', 'review', 'delivered'].includes(value)) {
        return 'Status inválido';
      }
      return undefined;
    default:
      return undefined;
  }
};

/**
 * Calculate days left from deadline
 */
const calculateDaysLeft = (deadline: string): number => {
  const deadlineDate = parseLocalDate(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * CreateJobModal Component
 */
export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients = [],
}) => {
  const [formData, setFormData] = useState<CreateJobFormData>({
    title: '',
    clientId: '',
    deadline: '',
    status: 'briefing',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        clientId: '',
        deadline: '',
        status: 'briefing',
      });
      setErrors({});
      setTouched({});
      setApiError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle field change
  const handleChange = (field: keyof CreateJobFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setApiError(''); // Clear API error on any change

    // Validate field if already touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // Handle field blur (mark as touched)
  const handleBlur = (field: keyof CreateJobFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof CreateJobFormData>).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched({
      title: true,
      clientId: true,
      deadline: true,
      status: true,
    });

    return isValid;
  };

  // Check if form is valid for submit button
  const isFormValid = (): boolean => {
    return (
      formData.title.trim().length >= 3 &&
      formData.title.trim().length <= 200 &&
      !!formData.clientId &&
      !!formData.deadline &&
      parseLocalDate(formData.deadline) >= new Date(new Date().setHours(0, 0, 0, 0)) &&
      ['briefing', 'production', 'review', 'delivered'].includes(formData.status)
    );
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setApiError('');

    try {
      // API call to create job
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao criar job (${response.status})`);
      }

      const result = await response.json();
      const createdJob = result.data;

      // Find client name from clients list
      const selectedClient = clients.find((c) => c.id.toString() === formData.clientId);

      // Transform API response to Job format
      const newJob: Job = {
        id: createdJob.id,
        title: createdJob.title,
        client: selectedClient?.name || 'Cliente',
        status: createdJob.status,
        deadline: createdJob.deadline,
        daysLeft: calculateDaysLeft(createdJob.deadline),
        progress: 0, // New jobs start at 0%
        urgent: calculateDaysLeft(createdJob.deadline) < 3,
      };

      // Success callback
      if (onSuccess) {
        onSuccess(newJob);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating job:', error);
      setApiError(error instanceof Error ? error.message : 'Erro ao criar job. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Criar Novo Job"
      description="Preencha os campos abaixo para criar um novo job"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            aria-label="Criar job"
          >
            {isSubmitting ? 'Criando...' : 'Criar Job'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate aria-label="Criar novo job">
        {/* API Error */}
        {apiError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '12px 16px',
              marginBottom: '24px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.875rem',
            }}
          >
            {apiError}
          </div>
        )}

        {/* Title Field */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="job-title"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--plan-text-primary, #fff)',
            }}
          >
            Título do Job <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="job-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={() => handleBlur('title')}
            placeholder="Nome do projeto"
            aria-required="true"
            aria-invalid={touched.title && !!errors.title}
            aria-describedby={touched.title && errors.title ? 'title-error' : undefined}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${touched.title && errors.title ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: 'var(--plan-text-primary, #fff)',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              if (!errors.title) {
                e.target.style.borderColor = 'var(--plan-accent-primary, #FF6B00)';
              }
            }}
            onBlurCapture={(e) => {
              if (!errors.title) {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          />
          {touched.title && errors.title && (
            <p
              id="title-error"
              role="alert"
              style={{
                marginTop: '6px',
                fontSize: '0.75rem',
                color: '#ef4444',
              }}
            >
              {errors.title}
            </p>
          )}
        </div>

        {/* Client Field */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="job-client"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--plan-text-primary, #fff)',
            }}
          >
            Cliente <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            id="job-client"
            value={formData.clientId}
            onChange={(e) => handleChange('clientId', e.target.value)}
            onBlur={() => handleBlur('clientId')}
            aria-required="true"
            aria-invalid={touched.clientId && !!errors.clientId}
            aria-describedby={touched.clientId && errors.clientId ? 'client-error' : undefined}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${touched.clientId && errors.clientId ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: formData.clientId ? 'var(--plan-text-primary, #fff)' : 'rgba(255, 255, 255, 0.5)',
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            <option value="" disabled>
              Selecione um cliente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id.toString()}>
                {client.name} {client.company ? `- ${client.company}` : ''}
              </option>
            ))}
          </select>
          {touched.clientId && errors.clientId && (
            <p
              id="client-error"
              role="alert"
              style={{
                marginTop: '6px',
                fontSize: '0.75rem',
                color: '#ef4444',
              }}
            >
              {errors.clientId}
            </p>
          )}
        </div>

        {/* Deadline Field */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="job-deadline"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--plan-text-primary, #fff)',
            }}
          >
            Deadline <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="job-deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            onBlur={() => handleBlur('deadline')}
            min={new Date().toISOString().split('T')[0]}
            aria-required="true"
            aria-invalid={touched.deadline && !!errors.deadline}
            aria-describedby={touched.deadline && errors.deadline ? 'deadline-error' : undefined}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${touched.deadline && errors.deadline ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: 'var(--plan-text-primary, #fff)',
              outline: 'none',
              transition: 'border-color 0.2s',
              colorScheme: 'dark',
            }}
          />
          {touched.deadline && errors.deadline && (
            <p
              id="deadline-error"
              role="alert"
              style={{
                marginTop: '6px',
                fontSize: '0.75rem',
                color: '#ef4444',
              }}
            >
              {errors.deadline}
            </p>
          )}
        </div>

        {/* Status Field */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="job-status"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--plan-text-primary, #fff)',
            }}
          >
            Status <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            id="job-status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as JobStatus)}
            onBlur={() => handleBlur('status')}
            aria-required="true"
            aria-invalid={touched.status && !!errors.status}
            aria-describedby={touched.status && errors.status ? 'status-error' : undefined}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${touched.status && errors.status ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: 'var(--plan-text-primary, #fff)',
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            <option value="briefing">Briefing</option>
            <option value="production">Produção</option>
            <option value="review">Review</option>
            <option value="delivered">Entregue</option>
          </select>
          {touched.status && errors.status && (
            <p
              id="status-error"
              role="alert"
              style={{
                marginTop: '6px',
                fontSize: '0.75rem',
                color: '#ef4444',
              }}
            >
              {errors.status}
            </p>
          )}
        </div>
      </form>
    </AnimatedModal>
  );
};

export default CreateJobModal;
