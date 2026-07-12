export class AuthRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class OrganizationRequiredError extends Error {
  constructor(message = "An active organization is required.") {
    super(message);
    this.name = "OrganizationRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}
