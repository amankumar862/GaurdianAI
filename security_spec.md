# Security Specification: GuardianAI - Student Forensic Shield

## 1. Data Invariants
- A `ScamReport` must have a valid `reportedBy` ID that matches the UID of the authenticated user who created it.
- A `ScamReport` must have a category from the predefined enum: `["internship", "scholarship", "hackathon", "phishing", "other"]`.
- `riskScore` must be a number between 0 and 100.
- `UserProfile` can only be read, created, or updated by the owner of that profile.
- `isAdmin` field in `UserProfile` cannot be set by the user themselves (must be handled by an admin or system).
- `createdAt` and `updatedAt` (if used) must be server-validated timestamps.

## 2. The "Dirty Dozen" Payloads (Anti-Tests)

### ScamReport Attacks
1. **Identity Spoofing**: Creating a report with a different user's UID in `reportedBy`.
2. **Resource Poisoning**: Sending an extremely long string (1MB+) in `title` or `explanation`.
3. **Enum Break**: Sending an invalid `type` (e.g., "legit_opportunity").
4. **Boundary Violation**: Sending a `riskScore` of -1 or 999.
5. **Unauthorized Update**: Attempting to update a report after creation (should be blocked as per currently identified business logic, or strictly controlled).
6. **Unauthorized Delete**: Attempting to delete a report by a non-owner or even an owner (if immutable).
7. **Phantom Doc ID**: Using a doc ID containing malicious characters like `../../hack`.

### UserProfile Attacks
8. **PII Leak**: Reading another user's profile to steal their email/PII.
9. **Privilege Escalation**: Setting `isAdmin: true` during profile creation or update.
10. **Shadow Field Injection**: Adding a field like `isVerifiedByGoogle: true` to the user profile.
11. **Idempotency/Immutability Break**: Changing the `email` field after it's been set.
12. **Anonymous Write**: Attempting to create a profile without being authenticated.

## 3. Red Team Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| reports | Guarded by `isValidReport` and `isOwner` | Reports are terminal (no status flow yet) | Need size checks on strings |
| users | Guarded by `isOwner` | `isAdmin` must be protected | Need size checks on email |

