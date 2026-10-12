Feature: Enable Inline Task Title Editing with Confirmation-Guarded Deletion
  # CC-115: Enable Inline Task Title Editing with Confirmation-Guarded Deletion

  Background:
    Given the Task Manager app is running at http://localhost:3000
    And the task list is cleared of all existing tasks

  Scenario 1: User edits a task title inline and saves via Enter
    Given a task with title "Buy groceries" is visible in the list
    When the user double-clicks the task title
    Then the title span is replaced by a focused text input pre-filled with "Buy groceries"
    When the user changes the text to "Buy groceries and milk" and presses Enter
    Then the input is replaced by the updated title span showing "Buy groceries and milk"
    And PUT /api/tasks/:id is called with the new title
    And the updated title is persisted in the JSON store

  Scenario 2: User cancels an in-progress edit via Escape
    Given a task with title "Read a book" is visible in the list
    When the user double-clicks the task title
    And the user changes the text to "Read two books"
    And the user presses Escape
    Then the input is replaced by the original title span with the unchanged title "Read a book"
    And no API call is made

  Scenario 3: User attempts to save an empty title
    Given a task with title "Call the bank" is visible in the list
    When the user double-clicks the task title
    And the user clears the input and presses Enter
    Then the input is not submitted
    And the original task title "Call the bank" is restored
    And no API call is made

  Scenario 4: User deletes a task and confirms the action
    Given a task with title "Schedule meeting" is visible in the list
    When the user clicks the delete button
    Then a confirmation prompt is displayed asking the user to confirm deletion
    When the user confirms
    Then DELETE /api/tasks/:id is called
    And the task is removed from the list and from the JSON store

  Scenario 5: User cancels a delete action
    Given a task with title "Pay the rent" is visible in the list
    When the user clicks the delete button
    And the confirmation prompt appears
    When the user dismisses or cancels the prompt
    Then no API call is made
    And the task remains in the list unchanged