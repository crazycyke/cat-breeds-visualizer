const { test, expect } = require('@playwright/test');

/**
 * Example test patterns for the Cat Breeds Visualizer
 * 
 * This file demonstrates how to write tests for this project using the correct element IDs
 * and shows common testing patterns you can use.
 */

test.describe('Cat Breeds Visualizer - Test Patterns', () => {

  test('Example: Testing keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    
    // Test "/" key to focus global search
    await page.keyboard.press('/');
    
    // Verify the global search input is focused
    const focusedElement = await page.evaluate(() => document.activeElement.id);
    expect(focusedElement).toBe('globalSearch');
    
    // Test "g" key to focus URL input
    await page.keyboard.press('g');
    
    // Verify URL input is focused
    const urlFocused = await page.evaluate(() => document.activeElement.id);
    expect(urlFocused).toBe('urlInput');
  });

  test('Example: Testing form interactions', async ({ page }) => {
    await page.goto('/');
    
    // Fill in various form fields
    await page.fill('#breedFilter', 'Persian');
    await page.fill('#countryFilter', 'Iran');
    await page.fill('#globalSearch', 'fluffy cats');
    
    // Verify values were set
    expect(await page.inputValue('#breedFilter')).toBe('Persian');
    expect(await page.inputValue('#countryFilter')).toBe('Iran');
    expect(await page.inputValue('#globalSearch')).toBe('fluffy cats');
    
    // Test clearing filters
    await page.click('#clearFiltersBtn');
    
    // Verify filters were cleared
    expect(await page.inputValue('#breedFilter')).toBe('');
    expect(await page.inputValue('#countryFilter')).toBe('');
  });

  test('Example: Testing button clicks and UI state', async ({ page }) => {
    await page.goto('/');
    
    // Test expanding advanced controls
    await page.click('#advancedControls summary');
    await expect(page.locator('#advancedControls')).toHaveAttribute('open');
    
    // Test expanding advanced filters
    await page.click('#advPanel summary');
    await expect(page.locator('#advPanel')).toHaveAttribute('open');
    
    // Verify advanced filter inputs are visible
    await expect(page.locator('#advBreed')).toBeVisible();
    await expect(page.locator('#advCountry')).toBeVisible();
    await expect(page.locator('#advLogic')).toBeVisible();
  });

  test('Example: Testing dropdown selections', async ({ page }) => {
    await page.goto('/');
    
    // Test table page size dropdown
    await page.selectOption('#tablePageSize', '25');
    expect(await page.inputValue('#tablePageSize')).toBe('25');
    
    // Expand advanced filters and test logic dropdown
    await page.click('#advPanel summary');
    await page.selectOption('#advLogic', 'OR');
    expect(await page.inputValue('#advLogic')).toBe('OR');
  });

  test('Example: Testing modal interactions', async ({ page }) => {
    await page.goto('/');
    
    // Open help modal
    await page.click('#helpBtn');
    await expect(page.locator('#helpModal')).toBeVisible();
    await expect(page.locator('#helpModal')).not.toHaveAttribute('hidden');
    
    // Verify modal content
    await expect(page.locator('#helpTitle')).toContainText('Keyboard shortcuts');
    
    // Test closing with Escape key
    await page.keyboard.press('Escape');
    await expect(page.locator('#helpModal')).toBeHidden();
    
    // Open again and close with button
    await page.click('#helpBtn');
    await expect(page.locator('#helpModal')).toBeVisible();
    await page.click('#helpCloseBtn');
    await expect(page.locator('#helpModal')).toBeHidden();
  });

  test('Example: Testing with API mocking', async ({ page }) => {
    // Mock the API response
    await page.route('**/breeds*', async route => {
      const mockData = [
        {
          breed: 'Test Breed 1',
          country: 'Test Country 1',
          origin: 'Test Origin 1',
          coat: 'Short',
          pattern: 'Solid'
        },
        {
          breed: 'Test Breed 2', 
          country: 'Test Country 2',
          origin: 'Test Origin 2',
          coat: 'Long',
          pattern: 'Tabby'
        }
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData)
      });
    });
    
    await page.goto('/');
    
    // Trigger a data load
    await page.click('#loadBtn');
    
    // Wait a moment for the request
    await page.waitForTimeout(1000);
    
    // Verify table has the mock data (if app populates table)
    const tableExists = await page.locator('#breedsTable tbody tr').count();
    // Note: This would depend on your app's actual behavior
  });

  test('Example: Testing number inputs and validation', async ({ page }) => {
    await page.goto('/');
    
    // Test limit input
    await page.fill('#limitInput', '50');
    expect(await page.inputValue('#limitInput')).toBe('50');
    
    // Test facts limit
    await page.fill('#factsLimit', '20');
    expect(await page.inputValue('#factsLimit')).toBe('20');
    
    // Test fact max length inputs
    await page.fill('#factMaxLen', '200');
    expect(await page.inputValue('#factMaxLen')).toBe('200');
    
    await page.fill('#factsListMaxLen', '150');
    expect(await page.inputValue('#factsListMaxLen')).toBe('150');
  });

  test('Example: Testing checkbox and auto-refresh functionality', async ({ page }) => {
    await page.goto('/');
    
    // Test auto-refresh checkbox
    await page.check('#autoRefreshFact');
    expect(await page.isChecked('#autoRefreshFact')).toBe(true);
    
    // Test interval input
    await page.fill('#factIntervalSec', '45');
    expect(await page.inputValue('#factIntervalSec')).toBe('45');
    
    // Uncheck auto-refresh
    await page.uncheck('#autoRefreshFact');
    expect(await page.isChecked('#autoRefreshFact')).toBe(false);
  });

  test('Example: Testing URL input and button interactions', async ({ page }) => {
    await page.goto('/');
    
    // Test URL input
    const testUrl = 'https://api.example.com/breeds?limit=25&page=0';
    await page.fill('#urlInput', testUrl);
    expect(await page.inputValue('#urlInput')).toBe(testUrl);
    
    // Test convenience buttons (these should modify the URL)
    await page.click('#useRecommended'); // "Use 50 per page"
    
    // Wait for URL to be updated
    await page.waitForTimeout(100);
    
    const urlAfter50 = await page.inputValue('#urlInput');
    expect(urlAfter50).toContain('limit=50');
    
    // Test 100 per page button
    await page.click('#use100');
    await page.waitForTimeout(100);
    
    const urlAfter100 = await page.inputValue('#urlInput');
    expect(urlAfter100).toContain('limit=100');
  });

  test('Example: Testing table structure and accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Verify table has proper ARIA labels and structure
    const table = page.locator('#breedsTable');
    await expect(table).toBeVisible();
    
    // Check thead structure
    const headers = page.locator('#breedsTable thead th');
    await expect(headers).toHaveCount(5);
    
    // Verify specific headers
    await expect(headers.nth(0)).toContainText('Breed');
    await expect(headers.nth(1)).toContainText('Country');
    await expect(headers.nth(2)).toContainText('Origin');
    await expect(headers.nth(3)).toContainText('Coat');
    await expect(headers.nth(4)).toContainText('Pattern');
    
    // Verify data-key attributes for sorting
    await expect(headers.nth(0)).toHaveAttribute('data-key', 'breed');
    await expect(headers.nth(1)).toHaveAttribute('data-key', 'country');
  });
});
