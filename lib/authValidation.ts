export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export const PASSWORD_REGEX_MESSAGE =
  'Must be 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&#)';
