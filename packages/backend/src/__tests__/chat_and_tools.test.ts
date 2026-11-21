import { toolRegistryService } from '../services/agent/tool_registry.service';
import { inferenceService } from '../services/ai/inference.service';
import { getSystemPromptForMode } from '@bantai/shared';

describe('AI Inference, Personality Modes & Agent Tool Registry', () => {
  test('Mumbai Tapori personality system prompt is well-formed and contains key anchors', () => {
    const taporiPrompt = getSystemPromptForMode('tapori');
    expect(taporiPrompt).toContain('BANTAI');
    expect(taporiPrompt).toContain('Mumbai Tapori');
    expect(taporiPrompt).toContain('Intelligent, factual, and accurate FIRST');
    expect(taporiPrompt).toContain('Apna Model. Apna Dimaag. Apna AI.');

    const devPrompt = getSystemPromptForMode('developer');
    expect(devPrompt).toContain('Developer Mode');
    expect(devPrompt).toContain('Production-ready code');
  });

  test('Tool: Calculator accurately evaluates mathematical operations', async () => {
    const res = await toolRegistryService.executeTool(
      'calculator',
      { expression: '(50 * 4) + Math.sqrt(144)' },
      { userId: 'test_user_calc' }
    );

    expect(res.success).toBe(true);
    expect((res.data as { result: number }).result).toBe(212);
  });

  test('Tool: Sandboxed Code Executor requires user authorization', async () => {
    // Attempt without approval
    const unapproved = await toolRegistryService.executeTool(
      'sandbox_code_executor',
      { code: 'const a = 10; const b = 20; a + b;' },
      { userId: 'test_user_sandbox', userApproved: false }
    );

    expect(unapproved.requiresApproval).toBe(true);

    // Attempt with explicit approval
    const approved = await toolRegistryService.executeTool(
      'sandbox_code_executor',
      { code: 'const x = [1, 2, 3].map(n => n * 2); x;' },
      { userId: 'test_user_sandbox', userApproved: true }
    );

    expect(approved.success).toBe(true);
    expect((approved.data as { output: number[] }).output).toEqual([2, 4, 6]);
  });

  test('Tool: Task Manager creates task in personal registry', async () => {
    const res = await toolRegistryService.executeTool(
      'task_manager',
      { action: 'create', title: 'Verify Self-Hosted Inference Pipeline', priority: 'high' },
      { userId: 'test_user_task' }
    );

    expect(res.success).toBe(true);
    const data = res.data as { action: string; task: { title: string; priority: string } };
    expect(data.action).toBe('created');
    expect(data.task.title).toBe('Verify Self-Hosted Inference Pipeline');
  });

  test('InferenceService streams responses without external APIs', async () => {
    const chunks: string[] = [];
    const response = await inferenceService.streamChat(
      {
        conversationId: 'test_conv_stream',
        personalityMode: 'tapori',
        modelId: 'qwen2.5:7b',
        messages: [{
          id: 'msg_1',
          conversationId: 'test_conv_stream',
          userId: 'user_test',
          role: 'user',
          content: 'Apun ko bata QuickSort kya hai?',
          personalityMode: 'tapori',
          createdAt: new Date().toISOString()
        }]
      },
      chunk => {
        if (chunk.content) chunks.push(chunk.content);
      }
    );

    expect(response.length).toBeGreaterThan(10);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
