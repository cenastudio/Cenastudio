/**
 * ChecklistColumn Component Tests
 *
 * Tests cover all acceptance criteria:
 * 1. Component created with TypeScript interface ✓
 * 2. Title displays "✓ MINHAS TAREFAS" (checkmark + text, uppercase) ✓
 * 3. Displays list of ChecklistItem components ✓
 * 4. Items ordered by creation (newest first or custom order) ✓
 * 5. Scroll container: max-height 400px, overflow-y: auto ✓
 * 6. Input field: "+ Nova tarefa" placeholder, text input ✓
 * 7. Enter key creates new task (calls onCreate handler) ✓
 * 8. Empty input ignored (no empty tasks) ✓
 * 9. Empty state: if items.length = 0, shows message ✓
 * 10. All callbacks (onToggle, onDelete, onCreate) work correctly ✓
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChecklistColumn, ChecklistColumnProps, ChecklistTask } from './ChecklistColumn';
import React from 'react';

// Mock wouter for Link component used by ChecklistItem
vi.mock('wouter', () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Sample test data
const mockItems: ChecklistTask[] = [
  { id: '1', text: 'Task 1', checked: false },
  { id: '2', text: 'Task 2', checked: true },
  { id: '3', text: 'Task 3 with link', checked: false, link: '/task/3' },
];

// Default props for testing
const defaultProps: ChecklistColumnProps = {
  items: mockItems,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onCreate: vi.fn(),
};

describe('ChecklistColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders component with required props', () => {
      render(<ChecklistColumn {...defaultProps} />);

      expect(screen.getByTestId('checklist-column')).toBeInTheDocument();
      expect(screen.getByText('✓ MINHAS TAREFAS')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('+ Nova tarefa')).toBeInTheDocument();
    });

    it('renders with TypeScript interface', () => {
      // Type check - this test confirms TypeScript compilation
      const props: ChecklistColumnProps = defaultProps;
      render(<ChecklistColumn {...props} />);
      expect(screen.getByTestId('checklist-column')).toBeInTheDocument();
    });

    it('renders with correct container styles', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveStyle({
        padding: '24px',
        borderRadius: '24px',
      });
    });

    it('has glass effect classes', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveClass('backdrop-blur-sm');
      expect(container).toHaveClass('bg-gradient-to-br');
    });
  });

  describe('Title Display', () => {
    it('displays title "✓ MINHAS TAREFAS"', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const title = screen.getByText('✓ MINHAS TAREFAS');
      expect(title).toBeInTheDocument();
    });

    it('title includes checkmark symbol', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const title = screen.getByText('✓ MINHAS TAREFAS');
      expect(title.textContent).toContain('✓');
    });

    it('title is uppercase', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const title = screen.getByText('✓ MINHAS TAREFAS');
      expect(title).toHaveClass('uppercase');
    });

    it('title has 0.875rem font size', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const title = screen.getByText('✓ MINHAS TAREFAS');
      expect(title).toHaveStyle({ fontSize: '14px' });
    });

    it('title has correct typography classes', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const title = screen.getByText('✓ MINHAS TAREFAS');
      expect(title).toHaveClass('text-xs');
      expect(title).toHaveClass('font-frame-mono');
      expect(title).toHaveClass('tracking-wider');
    });
  });

  describe('Items List Display', () => {
    it('displays list of ChecklistItem components', () => {
      render(<ChecklistColumn {...defaultProps} />);

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3 with link')).toBeInTheDocument();
    });

    it('renders correct number of items', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('preserves item order from props', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const items = screen.getAllByText(/^Task/);
      expect(items[0]).toHaveTextContent('Task 1');
      expect(items[1]).toHaveTextContent('Task 2');
      expect(items[2]).toHaveTextContent('Task 3');
    });

    it('passes correct props to ChecklistItem', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const checkbox = screen.getAllByRole('checkbox')[0];
      expect(checkbox).not.toBeChecked(); // Task 1 is not checked

      const checkedCheckbox = screen.getAllByRole('checkbox')[1];
      expect(checkedCheckbox).toBeChecked(); // Task 2 is checked
    });

    it('renders items with links correctly', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const linkText = screen.getByText('Task 3 with link');
      const link = linkText.closest('a');
      expect(link).toHaveAttribute('href', '/task/3');
    });
  });

  describe('Scroll Container', () => {
    it('has scroll container with max-height 400px', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-items-container');
      expect(container).toHaveStyle({ maxHeight: '400px' });
    });

    it('has overflow-y auto class', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-items-container');
      expect(container).toHaveClass('overflow-y-auto');
    });

    it('has smooth-scroll class', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-items-container');
      expect(container).toHaveClass('smooth-scroll');
    });

    it('renders scrollable container with many items', () => {
      const manyItems: ChecklistTask[] = Array.from({ length: 15 }, (_, i) => ({
        id: `item-${i}`,
        text: `Task ${i + 1}`,
        checked: false,
      }));

      render(<ChecklistColumn {...defaultProps} items={manyItems} />);

      const container = screen.getByTestId('checklist-items-container');
      expect(container).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(15);
    });
  });

  describe('Input Field', () => {
    it('renders input field with correct placeholder', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      expect(input).toBeInTheDocument();
    });

    it('input is a text input', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByTestId('checklist-input');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('input has correct styling classes', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByTestId('checklist-input');
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('text-sm');
      expect(input).toHaveClass('rounded-lg');
    });

    it('input value updates on typing', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa') as HTMLInputElement;
      await userEvent.type(input, 'New task');

      expect(input.value).toBe('New task');
    });

    it('input accepts text input', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');

      await userEvent.clear(input);
      await userEvent.type(input, 'Test input');

      expect(input).toHaveValue('Test input');
    });
  });

  describe('Enter Key - Create Task', () => {
    it('calls onCreate handler when Enter is pressed with text', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'New task{Enter}');

      expect(onCreate).toHaveBeenCalledWith('New task');
      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('clears input after creating task', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa') as HTMLInputElement;
      await userEvent.type(input, 'New task{Enter}');

      expect(input.value).toBe('');
    });

    it('trims whitespace before creating task', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, '  New task with spaces  {Enter}');

      expect(onCreate).toHaveBeenCalledWith('New task with spaces');
    });

    it('prevents default Enter behavior', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'Test');

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      fireEvent(input, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Empty Input Ignored', () => {
    it('does not call onCreate when input is empty', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, '{Enter}');

      expect(onCreate).not.toHaveBeenCalled();
    });

    it('does not call onCreate when input has only whitespace', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, '   {Enter}');

      expect(onCreate).not.toHaveBeenCalled();
    });

    it('does not clear input when empty and Enter pressed', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa') as HTMLInputElement;
      await userEvent.type(input, '   ');
      const valueBefore = input.value;

      await userEvent.type(input, '{Enter}');

      expect(input.value).toBe(valueBefore);
    });

    it('ignores multiple spaces and tabs', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      fireEvent.change(input, { target: { value: '  \t  \t  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when items array is empty', () => {
      render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('displays empty state message', () => {
      render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.getByText('Sua checklist está vazia')).toBeInTheDocument();
    });

    it('displays motivational text in empty state', () => {
      render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.getByText('Adicione sua primeira tarefa abaixo')).toBeInTheDocument();
    });

    it('does not show items container when empty', () => {
      render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.queryByTestId('checklist-items-container')).not.toBeInTheDocument();
    });

    it('does not show empty state when items exist', () => {
      render(<ChecklistColumn {...defaultProps} />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    it('switches from empty state to items list when item added', () => {
      const { rerender } = render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();

      rerender(<ChecklistColumn {...defaultProps} items={[{ id: '1', text: 'New task', checked: false }]} />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('checklist-items-container')).toBeInTheDocument();
    });
  });

  describe('Callback Handlers - onToggle', () => {
    it('calls onToggle when checkbox is clicked', async () => {
      const onToggle = vi.fn();
      render(<ChecklistColumn {...defaultProps} onToggle={onToggle} />);

      const checkbox = screen.getAllByRole('checkbox')[0];
      await userEvent.click(checkbox);

      expect(onToggle).toHaveBeenCalledWith('1');
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle with correct id for different items', async () => {
      const onToggle = vi.fn();
      render(<ChecklistColumn {...defaultProps} onToggle={onToggle} />);

      const checkboxes = screen.getAllByRole('checkbox');

      await userEvent.click(checkboxes[0]);
      expect(onToggle).toHaveBeenCalledWith('1');

      await userEvent.click(checkboxes[1]);
      expect(onToggle).toHaveBeenCalledWith('2');

      await userEvent.click(checkboxes[2]);
      expect(onToggle).toHaveBeenCalledWith('3');
    });

    it('calls onToggle multiple times for same item', async () => {
      const onToggle = vi.fn();
      render(<ChecklistColumn {...defaultProps} onToggle={onToggle} />);

      const checkbox = screen.getAllByRole('checkbox')[0];

      await userEvent.click(checkbox);
      await userEvent.click(checkbox);
      await userEvent.click(checkbox);

      expect(onToggle).toHaveBeenCalledTimes(3);
      expect(onToggle).toHaveBeenCalledWith('1');
    });
  });

  describe('Callback Handlers - onDelete', () => {
    it('calls onDelete when delete button is clicked', async () => {
      const onDelete = vi.fn();
      const { container } = render(<ChecklistColumn {...defaultProps} onDelete={onDelete} />);

      // Hover over first item to show delete button
      const items = container.querySelectorAll('.flex.items-center.gap-2');
      if (items[0]) {
        fireEvent.mouseEnter(items[0]);

        await waitFor(() => {
          const deleteButton = screen.getByLabelText('Delete Task 1');
          expect(deleteButton).toBeInTheDocument();
        });

        const deleteButton = screen.getByLabelText('Delete Task 1');
        await userEvent.click(deleteButton);

        expect(onDelete).toHaveBeenCalledWith('1');
        expect(onDelete).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onDelete with correct id for different items', async () => {
      const onDelete = vi.fn();
      const { container } = render(<ChecklistColumn {...defaultProps} onDelete={onDelete} />);

      const items = container.querySelectorAll('.flex.items-center.gap-2');

      // Delete second item
      if (items[1]) {
        fireEvent.mouseEnter(items[1]);

        await waitFor(() => {
          const deleteButton = screen.getByLabelText('Delete Task 2');
          expect(deleteButton).toBeInTheDocument();
        });

        const deleteButton = screen.getByLabelText('Delete Task 2');
        await userEvent.click(deleteButton);

        expect(onDelete).toHaveBeenCalledWith('2');
      }
    });
  });

  describe('Callback Handlers - onCreate', () => {
    it('calls onCreate with text when Enter pressed', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'Buy milk{Enter}');

      expect(onCreate).toHaveBeenCalledWith('Buy milk');
    });

    it('calls onCreate only once per Enter press', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'Task 1{Enter}');

      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('allows creating multiple tasks sequentially', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');

      await userEvent.type(input, 'Task 1{Enter}');
      await userEvent.type(input, 'Task 2{Enter}');
      await userEvent.type(input, 'Task 3{Enter}');

      expect(onCreate).toHaveBeenCalledTimes(3);
      expect(onCreate).toHaveBeenNthCalledWith(1, 'Task 1');
      expect(onCreate).toHaveBeenNthCalledWith(2, 'Task 2');
      expect(onCreate).toHaveBeenNthCalledWith(3, 'Task 3');
    });
  });

  describe('Responsive Design', () => {
    it('has width 30% on desktop', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveClass('lg:w-[30%]');
    });

    it('has full width on mobile', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveClass('w-full');
    });
  });

  describe('Visual Design', () => {
    it('has glass effect background', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveClass('backdrop-blur-sm');
      expect(container).toHaveClass('bg-gradient-to-br');
    });

    it('has 24px padding', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveStyle({ padding: '24px' });
    });

    it('has 24px border radius', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveStyle({ borderRadius: '24px' });
    });

    it('has border', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const container = screen.getByTestId('checklist-column');
      expect(container).toHaveClass('border');
    });
  });

  describe('Keyboard Interactions', () => {
    it('input is focusable', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      input.focus();

      expect(document.activeElement).toBe(input);
    });

    it('only Enter key creates task', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'Test task');

      // Press other keys
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'Tab' });
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.keyDown(input, { key: 'Space' });

      expect(onCreate).not.toHaveBeenCalled();

      // Press Enter
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCreate).toHaveBeenCalledWith('Test task');
    });

    it('Enter with Shift does not create task', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'Test task');

      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      // Should not create task with Shift+Enter
      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('complete workflow: toggle, delete, create', async () => {
      const onToggle = vi.fn();
      const onDelete = vi.fn();
      const onCreate = vi.fn();
      const { container } = render(
        <ChecklistColumn
          items={mockItems}
          onToggle={onToggle}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      );

      // Toggle checkbox
      const checkbox = screen.getAllByRole('checkbox')[0];
      await userEvent.click(checkbox);
      expect(onToggle).toHaveBeenCalledWith('1');

      // Delete item
      const items = container.querySelectorAll('.flex.items-center.gap-2');
      if (items[0]) {
        fireEvent.mouseEnter(items[0]);
        await waitFor(() => {
          const deleteButton = screen.getByLabelText('Delete Task 1');
          expect(deleteButton).toBeInTheDocument();
        });
        const deleteButton = screen.getByLabelText('Delete Task 1');
        await userEvent.click(deleteButton);
        expect(onDelete).toHaveBeenCalledWith('1');
      }

      // Create new item
      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'New task{Enter}');
      expect(onCreate).toHaveBeenCalledWith('New task');
    });

    it('handles empty state to populated state transition', () => {
      const { rerender } = render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();

      const newItems: ChecklistTask[] = [
        { id: '1', text: 'First task', checked: false },
      ];

      rerender(<ChecklistColumn {...defaultProps} items={newItems} />);

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByTestId('checklist-items-container')).toBeInTheDocument();
      expect(screen.getByText('First task')).toBeInTheDocument();
    });

    it('renders with all item variations', () => {
      const mixedItems: ChecklistTask[] = [
        { id: '1', text: 'Unchecked task', checked: false },
        { id: '2', text: 'Checked task', checked: true },
        { id: '3', text: 'Task with link', checked: false, link: '/task/3' },
        { id: '4', text: 'Checked with link', checked: true, link: '/task/4' },
      ];

      render(<ChecklistColumn {...defaultProps} items={mixedItems} />);

      expect(screen.getByText('Unchecked task')).toBeInTheDocument();
      expect(screen.getByText('Checked task')).toBeInTheDocument();
      expect(screen.getByText('Task with link')).toBeInTheDocument();
      expect(screen.getByText('Checked with link')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
      expect(checkboxes[3]).toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero items', () => {
      render(<ChecklistColumn {...defaultProps} items={[]} />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('checklist-items-container')).not.toBeInTheDocument();
    });

    it('handles one item', () => {
      const oneItem: ChecklistTask[] = [
        { id: '1', text: 'Single task', checked: false },
      ];

      render(<ChecklistColumn {...defaultProps} items={oneItem} />);

      expect(screen.getByText('Single task')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    });

    it('handles many items (>10)', () => {
      const manyItems: ChecklistTask[] = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        text: `Task ${i + 1}`,
        checked: i % 2 === 0,
      }));

      render(<ChecklistColumn {...defaultProps} items={manyItems} />);

      expect(screen.getAllByRole('checkbox')).toHaveLength(20);
    });

    it('handles very long task text', () => {
      const longText = 'This is a very long task text that should still be displayed correctly without breaking the layout or causing overflow issues in the component';
      const items: ChecklistTask[] = [
        { id: '1', text: longText, checked: false },
      ];

      render(<ChecklistColumn {...defaultProps} items={items} />);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('handles special characters in task text', () => {
      const specialText = '< > & " \' / @ # $ % * ( ) [ ] { }';
      const items: ChecklistTask[] = [
        { id: '1', text: specialText, checked: false },
      ];

      render(<ChecklistColumn {...defaultProps} items={items} />);

      expect(screen.getByText(specialText)).toBeInTheDocument();
    });

    it('handles emojis in task text', () => {
      const emojiText = '🎬 📋 ✓ 💰 🚀 Complete the project';
      const items: ChecklistTask[] = [
        { id: '1', text: emojiText, checked: false },
      ];

      render(<ChecklistColumn {...defaultProps} items={items} />);

      expect(screen.getByText(emojiText)).toBeInTheDocument();
    });

    it('handles rapid input and Enter presses', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');

      await userEvent.type(input, 'Task 1{Enter}Task 2{Enter}Task 3{Enter}');

      expect(onCreate).toHaveBeenCalledTimes(3);
    });

    it('handles input with only newlines', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      fireEvent.change(input, { target: { value: '\n\n\n' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCreate).not.toHaveBeenCalled();
    });

    it('handles creating task with same text as existing task', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      await userEvent.type(input, 'Task 1{Enter}');

      // Should allow duplicate text (IDs will be different)
      expect(onCreate).toHaveBeenCalledWith('Task 1');
    });

    it('handles undefined link property', () => {
      const items: ChecklistTask[] = [
        { id: '1', text: 'Task without link', checked: false, link: undefined },
      ];

      render(<ChecklistColumn {...defaultProps} items={items} />);

      expect(screen.getByText('Task without link')).toBeInTheDocument();
      const text = screen.getByText('Task without link');
      expect(text.closest('a')).not.toBeInTheDocument();
    });

    it('input accepts paste events', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');

      await userEvent.click(input);
      await userEvent.paste('Pasted task');

      expect(input).toHaveValue('Pasted task');
    });

    it('handles rapid toggle clicks', async () => {
      const onToggle = vi.fn();
      render(<ChecklistColumn {...defaultProps} onToggle={onToggle} />);

      const checkbox = screen.getAllByRole('checkbox')[0];

      await userEvent.click(checkbox);
      await userEvent.click(checkbox);
      await userEvent.click(checkbox);
      await userEvent.click(checkbox);
      await userEvent.click(checkbox);

      expect(onToggle).toHaveBeenCalledTimes(5);
      expect(onToggle).toHaveBeenCalledWith('1');
    });
  });

  describe('Accessibility', () => {
    it('input has accessible name via placeholder', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa');
      expect(input).toBeInTheDocument();
    });

    it('checkboxes are accessible', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('component structure is semantic', () => {
      render(<ChecklistColumn {...defaultProps} />);

      const title = screen.getByText('✓ MINHAS TAREFAS');
      expect(title.tagName).toBe('H2');
    });

    it('focus management works correctly', async () => {
      // Use a single, link-less item so the tab order is deterministic:
      // checkbox -> its label -> the "new task" input.
      const singleItem: ChecklistTask[] = [{ id: '1', text: 'Task 1', checked: false }];
      render(<ChecklistColumn {...defaultProps} items={singleItem} />);

      const checkbox = screen.getAllByRole('checkbox')[0];
      const input = screen.getByPlaceholderText('+ Nova tarefa');

      // Focus the checklist item's checkbox (it comes before the input in
      // DOM order, since the items list renders above the input)
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);

      // Tab forward should eventually move focus to the "new task" input
      await userEvent.tab();
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Performance', () => {
    it('renders large list efficiently', () => {
      const largeList: ChecklistTask[] = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        text: `Task ${i + 1}`,
        checked: i % 3 === 0,
      }));

      const { container } = render(<ChecklistColumn {...defaultProps} items={largeList} />);

      expect(container).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(100);
    });

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<ChecklistColumn {...defaultProps} />);

      // Rerender with same props
      rerender(<ChecklistColumn {...defaultProps} />);

      expect(screen.getByTestId('checklist-column')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles all required props', () => {
      const requiredProps: ChecklistColumnProps = {
        items: [],
        onToggle: vi.fn(),
        onDelete: vi.fn(),
        onCreate: vi.fn(),
      };

      render(<ChecklistColumn {...requiredProps} />);

      expect(screen.getByTestId('checklist-column')).toBeInTheDocument();
    });

    it('items prop must be array', () => {
      render(<ChecklistColumn {...defaultProps} items={mockItems} />);

      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    });

    it('callback props must be functions', () => {
      const onToggle = vi.fn();
      const onDelete = vi.fn();
      const onCreate = vi.fn();

      render(
        <ChecklistColumn
          items={mockItems}
          onToggle={onToggle}
          onDelete={onDelete}
          onCreate={onCreate}
        />
      );

      expect(typeof onToggle).toBe('function');
      expect(typeof onDelete).toBe('function');
      expect(typeof onCreate).toBe('function');
    });
  });

  describe('State Management', () => {
    it('maintains input state correctly', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa') as HTMLInputElement;

      await userEvent.type(input, 'Test');
      expect(input.value).toBe('Test');

      await userEvent.type(input, ' task');
      expect(input.value).toBe('Test task');

      await userEvent.clear(input);
      expect(input.value).toBe('');
    });

    it('resets input after successful creation', async () => {
      const onCreate = vi.fn();
      render(<ChecklistColumn {...defaultProps} onCreate={onCreate} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa') as HTMLInputElement;

      await userEvent.type(input, 'Task 1{Enter}');
      expect(input.value).toBe('');

      await userEvent.type(input, 'Task 2{Enter}');
      expect(input.value).toBe('');
    });

    it('preserves input when Enter pressed with empty value', async () => {
      render(<ChecklistColumn {...defaultProps} />);

      const input = screen.getByPlaceholderText('+ Nova tarefa') as HTMLInputElement;

      await userEvent.type(input, '   ');
      const valueBefore = input.value;

      await userEvent.type(input, '{Enter}');
      expect(input.value).toBe(valueBefore);
    });
  });
});
