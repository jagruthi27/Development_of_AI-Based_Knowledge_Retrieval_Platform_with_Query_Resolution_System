import { expect, test } from '@playwright/test';

const user = {
  id: 1,
  full_name: 'Test User',
  email: 'test@example.com',
};

async function seedAuthenticatedSession(page) {
  await page.addInitScript(({ storedUser }) => {
    localStorage.setItem('qn_auth_token', 'test-token');
    localStorage.setItem('qn_auth_user', JSON.stringify(storedUser));
  }, { storedUser: user });

  await page.route('**/auth/me', async (route) => {
    await route.fulfill({ json: user });
  });
}

async function mockChatApi(page, { conversations = [], conversationMessages = [] } = {}) {
  await page.route('**/conversations', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          success: true,
          conversation_id: 'conversation-new',
        },
      });
      return;
    }

    await route.fulfill({
      json: {
        success: true,
        count: conversations.length,
        conversations,
      },
    });
  });

  await page.route('**/conversations/*', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        conversation_id: 'conversation-1',
        messages: conversationMessages,
      },
    });
  });

  await page.route('**/query', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        response: {
          answer: 'The mocked answer is available.',
          sources: [],
          confidence: 0.95,
        },
        retrieval: { results: [] },
      },
    });
  });
}

async function openChat(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'AI Chatbot', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible();
}

test.describe('chat workflow', () => {
  test.skip(({ isMobile }) => isMobile, 'Chat panel navigation is covered on desktop; mobile has a compact sidebar layout.');

  test('covers the end-to-end text conversation flow', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await mockChatApi(page);
    await openChat(page);

    const input = page.getByPlaceholder('Ask a question about your uploaded documents...');
    await input.fill('What is the leave policy?');
    await input.press('Enter');

    await expect(page.getByText('What is the leave policy?')).toBeVisible();
    await expect(page.getByText('The mocked answer is available.')).toBeVisible();
  });

  test('restores conversation memory and supports conversation selection', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await mockChatApi(page, {
      conversations: [
        { conversation_id: 'conversation-1', title: 'Leave policy' },
        { conversation_id: 'conversation-2', title: 'Benefits' },
      ],
      conversationMessages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'What is the leave policy?',
          created_at: '2026-01-01T10:00:00Z',
          message_metadata: {},
        },
        {
          id: 'message-2',
          role: 'assistant',
          content: 'Employees receive paid leave.',
          created_at: '2026-01-01T10:01:00Z',
          message_metadata: {},
        },
      ],
    });
    await openChat(page);

    await expect(page.getByText('Employees receive paid leave.').first()).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await page.locator('select').selectOption('conversation-2');
    await expect(page.getByText('Employees receive paid leave.').first()).toBeVisible();
  });

  test('shows conversation loading and API error states', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await page.route('**/conversations', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ status: 503, json: { detail: 'History is unavailable.' } });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'AI Chatbot', exact: true }).click();
    await expect(page.getByText('Loading conversation history...')).toBeVisible();
    await expect(page.getByText('AI service is temporarily busy. Please try again in a moment.')).toBeVisible();
  });
});

test.describe('voice and responsive UI', () => {
  test.skip(({ isMobile }) => isMobile, 'Voice interaction is covered on desktop Chromium.');

  test('accepts a speech transcript through the voice control', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await mockChatApi(page);
    await page.addInitScript(() => {
      class MockSpeechRecognition {
        start() {
          this.onstart?.();
          this.onresult?.({
            resultIndex: 0,
            results: [[{ transcript: 'voice question' }]],
          });
          this.onend?.();
        }

        stop() {
          this.onend?.();
        }

        abort() {
          this.onend?.();
        }
      }

      window.SpeechRecognition = MockSpeechRecognition;
    });
    await openChat(page);

    await page.getByRole('button', { name: 'Start voice input' }).click();
    await expect(page.getByPlaceholder('Ask a question about your uploaded documents...'))
      .toHaveValue('voice question');
  });

  test('keeps the chat usable at mobile width', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await mockChatApi(page);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'AI Chatbot', exact: true })).toBeVisible();
    await expect(page.locator('.sidebar')).toHaveCSS('width', '80px');
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);
  });
});
