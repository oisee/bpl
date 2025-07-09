:Connection Break Test

@Lane1
  task1
  task2
  ---
  task3
  
@Lane2
  task4
  ---
  task5
  task6

// Without break: task2 -> task3, task3 -> task4, task6 -> next lane task
// With break: task2 NOT-> task3, task4 NOT-> task5