import { expect, test as setup } from '@playwright/test';

import { signIn } from './helpers/auth';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
