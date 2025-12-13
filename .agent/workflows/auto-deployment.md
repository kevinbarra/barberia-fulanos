---
description: Global DevOps Protocol - Auto-Deployment Standard Operating Procedure
---

# GLOBAL DEVOPS PROTOCOL: AUTO-DEPLOYMENT

**Objective**: Automatically secure and deploy changes to production upon task completion.

## The Professional Workflow

### 1. Verification (Pre-flight)
- Ensure code is error-free.
- (Optional) Run type-check if critical files were touched.

### 2. Commit Strategy (Git)
- Stage all changes: `git add .`
- Create Semantic Commit Message: `git commit -m "type(scope): description"`
  - **Types**: 
    - `feat` (new feature)
    - `fix` (bug fix)
    - `refactor` (code change)
    - `style` (formatting)
    - `chore` (maintenance)
  - **Example**: `fix(kiosk): prevent pull-to-refresh on android tablets`

### 3. Deployment (The Trigger)
- Execute: `git push` (Triggers Vercel CI/CD)
- Fallback (if git push fails): `vercel --prod`

### 4. Confirmation
- Inform the user: "🚀 Cambios subidos y Despliegue iniciado. Verificando producción en breve."

**RULE**: Never finish a response saying "I have updated the code" without having executed step 3. The job is not done until the code is in the repository/production.
