const requiredFields = [
  'metric_key',
  'label',
  'value_display',
  'geography_type',
  'geography_slug',
  'geography_label',
  'property_type',
  'period_end',
  'as_of_date',
  'source_slug',
  'source_url',
];

export function validateMarketObservation(observation) {
  const errors = [];
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    return ['Observation must be an object'];
  }
  for (const field of requiredFields) {
    if (typeof observation[field] !== 'string' || !observation[field].trim()) {
      errors.push(`${field} is required`);
    }
  }
  if (observation.source_url) {
    try {
      const url = new URL(observation.source_url);
      if (url.protocol !== 'https:') errors.push('source_url must use HTTPS');
    } catch {
      errors.push('source_url must be a valid URL');
    }
  }
  for (const field of ['period_start', 'period_end', 'as_of_date']) {
    if (observation[field] && !/^\d{4}-\d{2}-\d{2}$/.test(observation[field])) {
      errors.push(`${field} must use YYYY-MM-DD`);
    }
  }
  if (observation.period_start && observation.period_end && observation.period_start > observation.period_end) {
    errors.push('period_start cannot be after period_end');
  }
  if (observation.period_end && observation.as_of_date && observation.period_end > observation.as_of_date) {
    errors.push('as_of_date cannot be before period_end');
  }
  if (observation.value_numeric != null && !Number.isFinite(Number(observation.value_numeric))) {
    errors.push('value_numeric must be numeric or null');
  }
  return errors;
}
