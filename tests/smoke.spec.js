const { test, expect } = require('@playwright/test');

test.describe('Cat Breeds Visualizer - Smoke Tests', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check main elements are visible using actual element IDs from your HTML
    await expect(page.locator('h1')).toContainText('Cat Breeds Visualizer');
    await expect(page.locator('#urlInput')).toBeVisible();
    await expect(page.locator('#loadBtn')).toBeVisible();
    await expect(page.locator('#executeBtn')).toBeVisible();
    await expect(page.locator('#breedsTable')).toBeVisible();
  });

  test('should have help modal functionality', async ({ page }) => {
    await page.goto('/');
    
    // Click help button
    await page.click('#helpBtn');
    
    // Verify modal is visible
    await expect(page.locator('#helpModal')).toBeVisible();
    await expect(page.locator('#helpTitle')).toContainText('Keyboard shortcuts');
    
    // Close modal with button
    await page.click('#helpCloseBtn');
    await expect(page.locator('#helpModal')).toBeHidden();
  });

  test('should have basic form inputs working', async ({ page }) => {
    await page.goto('/');
    
    // Test URL input
    await page.fill('#urlInput', 'https://example.com/test');
    const urlValue = await page.inputValue('#urlInput');
    expect(urlValue).toBe('https://example.com/test');
    
    // Test limit input
    await page.fill('#limitInput', '25');
    const limitValue = await page.inputValue('#limitInput');
    expect(limitValue).toBe('25');
    
    // Test global search
    await page.fill('#globalSearch', 'test search');
    const searchValue = await page.inputValue('#globalSearch');
    expect(searchValue).toBe('test search');
  });

  test('should display table structure', async ({ page }) => {
    await page.goto('/');
    
    // Check table exists and has proper headers
    await expect(page.locator('#breedsTable')).toBeVisible();
    await expect(page.locator('#breedsTable th[data-key="breed"]')).toContainText('Breed');
    await expect(page.locator('#breedsTable th[data-key="country"]')).toContainText('Country');
    await expect(page.locator('#breedsTable th[data-key="origin"]')).toContainText('Origin');
  });

  test('should have chart canvas element', async ({ page }) => {
    await page.goto('/');
    
    // Check chart canvas exists
    await expect(page.locator('#countryChart')).toBeVisible();
  });
});
