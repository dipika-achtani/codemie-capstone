Feature: Inline Task Editing and Confirmation-Guarded Deletion
  # CC-113: Inline Task Editing and Confirmation-Guarded Deletion

  Background:
    Given the Task Manager app is running at http://localhost:3000
    And the task list is cleared of all existing tasks

  Scenario 1: User edits a task title inline and saves via Enter
    Given a task with title "Buy groceries" is visible in the list
    When the user double-clicks the task title
    Then the title span is replaced by a focused text input pre-filled with "Buy groceries"
    When the user clears the input and types "Buy groceries and milk" and presses Enter
    Then the input is replaced by the updated title span showing "Buy groceries and milk"
    And the task title in the list reads "Buy groceries and milk"

  Scenario 2: User cancels an in-progress edit via Escape
    Given a task with title "Read a book" is visible in the list
    When the user double-clicks the task title
    And the user changes the text to "Read two books"
    And the user presses Escape
    Then the input is replaced by the original title span showing "Read a book"
    And no API call is made

  Scenario 3: User attempts to save an empty title
    Given a task with title "Call the bank" is visible in the list
    When the user double-clicks the task title
    And the user clears the input field completely
    And the user presses Enter
    Then the original title "Call the bank" is restored
    And no API call is made

  Scenario 4: Only one task may be in edit mode at a time
    Given a task with title "Task Alpha" is visible in the list
    And a task with title "Task Beta" is visible in the list
    When the user double-clicks the title of "Task Alpha"
    Then an edit input is shown for "Task Alpha"
    When the user double-clicks the title of "Task Beta"
    Then only one edit input is visible in the entire list

  Scenario 5: User deletes a task and confirms the action
    Given a task with title "Schedule meeting" is visible in the list
    When the user clicks the delete button for that task
    And the confirmation prompt appears
    And the user accepts the prompt
    Then the task "Schedule meeting" is removed from the list

  Scenario 6: User cancels a delete action
    Given a task with title "Pay the rent" is visible in the list
    When the user clicks the delete button for that task
    And the confirmation prompt appears
    And the user dismisses the prompt
    Then the task "Pay the rent" remains in the list unchanged