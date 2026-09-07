export type EligibilityFacts = {
  ageYears: number | null;
  monthlyIncome: number | null;
  creditScore: number | null;
  city: string | null;
  pincode: string | null;
  occupation: string | null;
};

export type RuleDefinition = {
  key: string;
  ruleType: string;
  operator: string;
  value: unknown;
};

export type RuleVerdict = {
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING';
  matched: boolean | null;
  category: string;
};

const CATEGORY_BY_TYPE: Record<string, string> = {
  AGE: 'AGE',
  INCOME: 'INCOME',
  CREDIT_SCORE: 'CREDIT_PROFILE',
  EMPLOYMENT: 'EMPLOYMENT',
  CITY_POSTCODE: 'LOCATION',
  BANKRUPTCY: 'CREDIT_PROFILE',
  MAX_DEBT_RATIO: 'INCOME',
  MIN_BALANCE: 'INCOME',
  CUSTOM: 'PROFILE',
};

export function ageInYears(dateOfBirth: Date, asOf = new Date()): number {
  let age = asOf.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = asOf.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

export function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function definitionFromVersion(rule: RuleDefinition, ruleJson: unknown): RuleDefinition {
  const parsed = parseJsonValue(ruleJson);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ...rule, value: parseJsonValue(rule.value) };
  }
  const snapshot = parsed as Record<string, unknown>;
  return {
    key: typeof snapshot.key === 'string' ? snapshot.key : rule.key,
    ruleType: typeof snapshot.ruleType === 'string' ? snapshot.ruleType : rule.ruleType,
    operator: typeof snapshot.operator === 'string' ? snapshot.operator : rule.operator,
    value: parseJsonValue(snapshot.value !== undefined ? snapshot.value : rule.value),
  };
}

export function evaluateRule(definition: RuleDefinition, facts: EligibilityFacts): RuleVerdict {
  const category = CATEGORY_BY_TYPE[definition.ruleType] || 'PROFILE';
  const fact = factForType(definition.ruleType, facts, definition);
  if (!fact.present) {
    if (definition.operator === 'NOT_EXISTS') {
      return { status: 'ELIGIBLE', matched: true, category };
    }
    if (definition.operator === 'EXISTS') {
      return { status: 'INELIGIBLE', matched: false, category };
    }
    return { status: 'PENDING', matched: null, category };
  }
  const passed = compare(definition.operator, fact.value, definition.value);
  return {
    status: passed ? 'ELIGIBLE' : 'INELIGIBLE',
    matched: passed,
    category,
  };
}

export function customerReason(status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ADDITIONAL_INFORMATION_REQUIRED', category?: string): string {
  if (status === 'ELIGIBLE') {
    return 'You meet the current checks for this product.';
  }
  if (status === 'ADDITIONAL_INFORMATION_REQUIRED') {
    if (category === 'AGE') {
      return 'Add your date of birth so we can complete this check.';
    }
    if (category === 'INCOME') {
      return 'Add your income so we can complete this check.';
    }
    if (category === 'LOCATION') {
      return 'Add your city so we can complete this check.';
    }
    if (category === 'CREDIT_PROFILE') {
      return 'Additional credit information is required to complete this check.';
    }
    if (category === 'EMPLOYMENT') {
      return 'Add your occupation so we can complete this check.';
    }
    return 'Additional information is required to complete this check.';
  }
  if (category === 'AGE') {
    return 'Your age does not meet the requirement for this product.';
  }
  if (category === 'INCOME') {
    return 'Your income does not meet the requirement for this product.';
  }
  if (category === 'LOCATION') {
    return 'This product is not available in your location.';
  }
  if (category === 'CREDIT_PROFILE') {
    return 'Your credit profile does not meet the requirement for this product.';
  }
  if (category === 'EMPLOYMENT') {
    return 'Your employment details do not meet the requirement for this product.';
  }
  return 'You are not eligible for this product right now.';
}

function factForType(
  ruleType: string,
  facts: EligibilityFacts,
  definition: RuleDefinition,
): { present: boolean; value: unknown } {
  switch (ruleType) {
    case 'AGE':
      return presentNumber(facts.ageYears);
    case 'INCOME':
      return presentNumber(facts.monthlyIncome);
    case 'CREDIT_SCORE':
      return presentNumber(facts.creditScore);
    case 'EMPLOYMENT':
      return presentText(facts.occupation);
    case 'CITY_POSTCODE':
      return cityOrPincodeFact(facts, definition.value);
    default:
      return { present: false, value: null };
  }
}

function cityOrPincodeFact(facts: EligibilityFacts, expected: unknown): { present: boolean; value: unknown } {
  const sample = Array.isArray(expected) ? expected[0] : expected;
  if (typeof sample === 'string' && /^\d{6}$/.test(sample)) {
    return presentText(facts.pincode);
  }
  return presentText(facts.city);
}

function presentNumber(value: number | null): { present: boolean; value: unknown } {
  return value == null || !Number.isFinite(value) ? { present: false, value: null } : { present: true, value };
}

function presentText(value: string | null): { present: boolean; value: unknown } {
  const text = value?.trim();
  return text ? { present: true, value: text } : { present: false, value: null };
}

function compare(operator: string, fact: unknown, expected: unknown): boolean {
  switch (operator) {
    case 'GREATER_THAN':
      return toNumber(fact) > toNumber(expected);
    case 'GREATER_THAN_OR_EQUAL':
      return toNumber(fact) >= toNumber(expected);
    case 'LESS_THAN':
      return toNumber(fact) < toNumber(expected);
    case 'LESS_THAN_OR_EQUAL':
      return toNumber(fact) <= toNumber(expected);
    case 'EQUALS':
      return normalize(fact) === normalize(expected);
    case 'NOT_EQUALS':
      return normalize(fact) !== normalize(expected);
    case 'IN':
    case 'ANY_OF':
      return asList(expected).some((item) => normalize(item) === normalize(fact));
    case 'NOT_IN':
      return asList(expected).every((item) => normalize(item) !== normalize(fact));
    case 'BETWEEN': {
      const [min, max] = asList(expected);
      const value = toNumber(fact);
      return value >= toNumber(min) && value <= toNumber(max);
    }
    case 'CONTAINS':
      return String(fact).toLowerCase().includes(String(expected).toLowerCase());
    case 'EXISTS':
      return fact != null && String(fact).trim() !== '';
    case 'NOT_EXISTS':
      return fact == null || String(fact).trim() === '';
    default:
      return false;
  }
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown): number {
  return Number(value);
}

function normalize(value: unknown): string | number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const numeric = Number(value);
  if (typeof value !== 'string' && Number.isFinite(numeric) && String(value).trim() !== '') {
    return numeric;
  }
  return String(value ?? '')
    .trim()
    .toLowerCase();
}
