import {
  AgentExecutionPlan,
  AgentPlanStep,
  TOOL_NAMES
} from '@bantai/shared';
import { toolRegistryService } from './tool_registry.service';
import crypto from 'crypto';

export class AgentPlannerService {
  private activePlans: Map<string, AgentExecutionPlan> = new Map();

  /**
   * Analyze user request and generate an executable multi-step plan
   */
  async createPlan(userId: string, conversationId: string, goal: string): Promise<AgentExecutionPlan> {
    const steps = this.decomposeGoalIntoSteps(goal);

    const plan: AgentExecutionPlan = {
      planId: crypto.randomUUID(),
      userId,
      conversationId,
      goal,
      steps,
      currentStepIndex: 0,
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If step 0 requires approval, set status to waiting_approval
    if (steps.length > 0 && steps[0].requiresApproval) {
      plan.status = 'waiting_approval';
    } else {
      plan.status = 'executing';
    }

    this.activePlans.set(plan.planId, plan);
    return plan;
  }

  /**
   * Execute the plan step-by-step
   */
  async executePlan(planId: string, userId: string): Promise<AgentExecutionPlan> {
    const plan = this.activePlans.get(planId);
    if (!plan || plan.userId !== userId) {
      throw new Error('Plan not found or unauthorized');
    }

    while (plan.currentStepIndex < plan.steps.length) {
      const step = plan.steps[plan.currentStepIndex];

      // If approval is required and step is not yet marked approved, pause
      if (step.requiresApproval && step.status !== 'approved') {
        plan.status = 'waiting_approval';
        plan.updatedAt = new Date().toISOString();
        return plan;
      }

      const wasApproved = step.status === 'approved';
      step.status = 'in_progress';
      const execResult = await toolRegistryService.executeTool(
        step.toolName,
        step.arguments,
        { userId, conversationId: plan.conversationId, userApproved: wasApproved }
      );

      if (execResult.requiresApproval) {
        step.status = 'pending';
        step.requiresApproval = true;
        plan.status = 'waiting_approval';
        plan.updatedAt = new Date().toISOString();
        return plan;
      }

      if (!execResult.success) {
        step.status = 'failed';
        step.error = execResult.error;
        plan.status = 'failed';
        plan.updatedAt = new Date().toISOString();
        return plan;
      }

      step.status = 'completed';
      step.result = execResult.data;
      plan.currentStepIndex++;
    }

    plan.status = 'completed';
    plan.updatedAt = new Date().toISOString();
    return plan;
  }

  /**
   * Provide explicit user approval for a sensitive step
   */
  async approveStep(planId: string, stepIndex: number, userId: string, approved: boolean): Promise<AgentExecutionPlan> {
    const plan = this.activePlans.get(planId);
    if (!plan || plan.userId !== userId) throw new Error('Plan not found or unauthorized');

    const step = plan.steps[stepIndex];
    if (!step) throw new Error(`Step ${stepIndex} not found in plan`);

    if (approved) {
      step.status = 'approved';
      return await this.executePlan(planId, userId);
    } else {
      step.status = 'skipped';
      plan.status = 'failed';
      step.error = 'User rejected authorization for this step.';
      return plan;
    }
  }

  /**
   * Goal decomposition heuristics
   */
  private decomposeGoalIntoSteps(goal: string): AgentPlanStep[] {
    const lower = goal.toLowerCase();
    const steps: AgentPlanStep[] = [];

    // Case 1: Complex task with reminder + task management
    if (lower.includes('task') && lower.includes('remind')) {
      steps.push({
        stepIndex: 0,
        action: 'Create pending task record in user registry',
        toolName: TOOL_NAMES.TASK_MANAGER,
        arguments: { action: 'create', title: goal, priority: 'high' },
        requiresApproval: false,
        rationale: 'Persist the requested task before scheduling reminders.',
        status: 'pending'
      });
      steps.push({
        stepIndex: 1,
        action: 'Schedule corresponding notification reminder',
        toolName: TOOL_NAMES.REMINDER_SCHEDULER,
        arguments: {
          title: `Reminder: ${goal}`,
          scheduledTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          timezone: 'Asia/Kolkata'
        },
        requiresApproval: false,
        rationale: 'Ensure user receives proactive notification.',
        status: 'pending'
      });
      return steps;
    }

    // Case 2: Code analysis / calculation
    if (lower.includes('calculate') || lower.includes('math') || lower.includes('solve')) {
      const stripped = goal.replace(/[^0-9+\-*/().\s%]/g, '').trim();
      steps.push({
        stepIndex: 0,
        action: 'Perform exact mathematical calculation',
        toolName: TOOL_NAMES.CALCULATOR,
        arguments: { expression: stripped || '1+1' },
        requiresApproval: false,
        rationale: 'Compute deterministic result without hallucination.',
        status: 'pending'
      });
      return steps;
    }

    // Case 3: Email drafting / sending
    if (lower.includes('email') || lower.includes('mail')) {
      steps.push({
        stepIndex: 0,
        action: 'Create email draft',
        toolName: TOOL_NAMES.EMAIL_CONNECTOR,
        arguments: { action: 'draft', to: 'team@example.com', subject: 'Update from BANTAI', body: goal },
        requiresApproval: false,
        rationale: 'Prepare email draft for user review.',
        status: 'pending'
      });
      if (lower.includes('send')) {
        steps.push({
          stepIndex: 1,
          action: 'Send authorized email',
          toolName: TOOL_NAMES.EMAIL_CONNECTOR,
          arguments: { action: 'send', to: 'team@example.com', subject: 'Update from BANTAI', body: goal },
          requiresApproval: true, // Sensitive operation
          rationale: 'Never send outgoing communication without explicit approval.',
          status: 'pending'
        });
      }
      return steps;
    }

    // Default: Retrieval + task synthesis
    steps.push({
      stepIndex: 0,
      action: 'Retrieve relevant personal knowledge context',
      toolName: TOOL_NAMES.RAG_RETRIEVAL,
      arguments: { query: goal, topK: 3 },
      requiresApproval: false,
      rationale: 'Ground the plan in user specific knowledge.',
      status: 'pending'
    });

    return steps;
  }
}

export const agentPlannerService = new AgentPlannerService();
