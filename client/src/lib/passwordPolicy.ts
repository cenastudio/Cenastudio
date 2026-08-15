export function passwordRequirements(password: string) {
  return [
    { key: "app.auth.passwordRuleLength", met: password.length >= 10 },
    { key: "app.auth.passwordRuleUppercase", met: /[A-Z]/.test(password) },
    { key: "app.auth.passwordRuleLowercase", met: /[a-z]/.test(password) },
    { key: "app.auth.passwordRuleNumber", met: /[0-9]/.test(password) },
    { key: "app.auth.passwordRuleSymbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongPassword(password: string) {
  return passwordRequirements(password).every((rule) => rule.met);
}
