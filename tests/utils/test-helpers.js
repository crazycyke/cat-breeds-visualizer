const { expect } = require('@playwright/test');

/**
 * Test utilities and common actions for Cat Breeds Visualizer E2E tests
 */
class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Mock the Cat API with sample data
   */
  async mockCatAPI(options = {}) {
    const {
      limit = 50,
      page = 0,
      totalCount = 100,
      breeds = null
    } = options;

    const mockBreeds = breeds || this.generateMockBreeds(limit);
    
    await this.page.route('**/breeds*', async route => {
      const url = new URL(route.request().url());
      const requestedLimit = parseInt(url.searchParams.get('limit')) || 50;
      const requestedPage = parseInt(url.searchParams.get('page')) || 0;
      
      // Calculate the subset of breeds to return based on pagination
      const startIndex = requestedPage * requestedLimit;
      const endIndex = Math.min(startIndex + requestedLimit, mockBreeds.length);
      const paginatedBreeds = mockBreeds.slice(startIndex, endIndex);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(paginatedBreeds),
        headers: {
          'pagination-count': totalCount.toString(),
          'pagination-page': requestedPage.toString(),
          'pagination-limit': requestedLimit.toString()
        }
      });
    });
  }

  /**
   * Mock API failure
   */
  async mockAPIFailure(statusCode = 500) {
    await this.page.route('**/breeds*', async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'API Error' })
      });
    });
  }

  /**
   * Generate mock cat breed data
   */
  generateMockBreeds(count = 50) {
    const breeds = [];
    const origins = ['Egypt', 'United States', 'England', 'Thailand', 'Scotland', 'Russia'];
    const temperaments = ['Affectionate', 'Active', 'Gentle', 'Playful', 'Calm', 'Intelligent'];
    
    for (let i = 0; i < count; i++) {
      breeds.push({
        id: `breed_${i + 1}`,
        name: `Test Breed ${i + 1}`,
        origin: origins[i % origins.length],
        temperament: temperaments[i % temperaments.length] + ', ' + temperaments[(i + 1) % temperaments.length],
        description: `This is a test description for breed ${i + 1}`,
        life_span: `${10 + (i % 5)}-${15 + (i % 5)} years`,
        weight: {
          metric: `${3 + (i % 4)}-${6 + (i % 4)}`
        },
        adaptability: (i % 5) + 1,
        affection_level: (i % 5) + 1,
        child_friendly: (i % 5) + 1,
        dog_friendly: (i % 5) + 1,
        energy_level: (i % 5) + 1,
        grooming: (i % 5) + 1,
        health_issues: (i % 5) + 1,
        intelligence: (i % 5) + 1,
        shedding_level: (i % 5) + 1,
        social_needs: (i % 5) + 1,
        stranger_friendly: (i % 5) + 1,
        vocalisation: (i % 5) + 1,
        experimental: i % 2,
        hairless: (i % 10) === 0 ? 1 : 0,
        natural: i % 3 === 0 ? 1 : 0,
        rare: (i % 8) === 0 ? 1 : 0,
        rex: (i % 7) === 0 ? 1 : 0,
        suppressed_tail: (i % 12) === 0 ? 1 : 0,
        short_legs: (i % 15) === 0 ? 1 : 0
      });
    }
    return breeds;
  }

  /**
   * Wait for the app to be fully loaded
   */
  async waitForAppLoad() {
    await this.page.waitForSelector('#dataTable', { state: 'visible' });
    await this.page.waitForSelector('#loadingIndicator', { state: 'hidden' });
    await this.page.waitForFunction(() => {
      const table = document.querySelector('#dataTable tbody');
      return table && table.children.length > 0;
    }, { timeout: 10000 });
  }

  /**
   * Clear all filters and search
   */
  async clearFilters() {
    await this.page.click('#clearFiltersButton');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get table row count
   */
  async getTableRowCount() {
    return await this.page.locator('#dataTable tbody tr').count();
  }

  /**
   * Get table data as array of objects
   */
  async getTableData() {
    return await this.page.evaluate(() => {
      const table = document.querySelector('#dataTable');
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const rowData = {};
        headers.forEach((header, index) => {
          if (cells[index]) {
            rowData[header] = cells[index].textContent.trim();
          }
        });
        return rowData;
      });
    });
  }

  /**
   * Verify chart is visible and has data
   */
  async verifyChartExists() {
    await expect(this.page.locator('#chartContainer')).toBeVisible();
    await expect(this.page.locator('#chartContainer canvas')).toBeVisible();
  }

  /**
   * Verify pagination controls are working
   */
  async verifyPaginationControls() {
    // Check API pagination controls
    await expect(this.page.locator('#prevApiPageButton')).toBeVisible();
    await expect(this.page.locator('#nextApiPageButton')).toBeVisible();
    await expect(this.page.locator('#currentApiPageSpan')).toBeVisible();
    
    // Check table pagination controls
    await expect(this.page.locator('#itemsPerPageSelect')).toBeVisible();
    await expect(this.page.locator('#prevTablePageButton')).toBeVisible();
    await expect(this.page.locator('#nextTablePageButton')).toBeVisible();
  }

  /**
   * Test keyboard shortcut
   */
  async testKeyboardShortcut(key, modifiers = []) {
    if (modifiers.length > 0) {
      await this.page.keyboard.press(`${modifiers.join('+')}+${key}`);
    } else {
      await this.page.keyboard.press(key);
    }
    await this.page.waitForTimeout(100);
  }

  /**
   * Verify export functionality by checking download
   */
  async testCSVExport(buttonSelector) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(buttonSelector);
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.csv');
    return download;
  }

  /**
   * Get current URL from the Request URL input
   */
  async getCurrentRequestURL() {
    return await this.page.inputValue('#apiUrlInput');
  }

  /**
   * Set custom API URL
   */
  async setRequestURL(url) {
    await this.page.fill('#apiUrlInput', url);
  }

  /**
   * Click Execute button
   */
  async executeRequest() {
    await this.page.click('#executeButton');
    await this.page.waitForTimeout(1000);
  }
}

module.exports = TestHelpers;
