:Test Process

@Lane1
  !Start
  task1
  task2
  !End

@Lane2
  task3
  ?Decision
    +task4
    +!End
    -task5