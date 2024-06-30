module Stack exposing
  ( Stack
  , empty, isEmpty, size
  , toList, fromList
  , pop, push, peek, member
  , append, concat, map, filter
  )

{-| A basic implementaion of a generic Stack data strucutre.

@docs Stack, empty, isEmpty, size, toList, fromList, pop, push, peek, member, append, concat, map, filter
-}

{-| A generic stack definition.
-}
type Stack a
  = Stack Int (List a)

{-| Initialize an empty stack.
-}
empty : Stack a
empty = Stack 0 []

{-| Given a `Stack`, returns `True` if the `Stack` is empty
    or `False` if `Stack` has one or more elements.

      Stack.isEmpty Stack.empty => True

      List.range 1 10
        |> Stack.fromList
        |> Stack.isEmpty        => False
-}
isEmpty : Stack a -> Bool
isEmpty (Stack _ xs) =
  List.isEmpty xs

{-| Returns how many elements are in the `Stack` as an `Int`.

      Stack.size Stack.empty     => 0

      Stack.fromList [1, 2, 3]
        |> Stack.size            => 3
-}
size : Stack a -> Int
size (Stack count _) = count

{-| Given a `Stack`, returns a list where the head of the list
    is the first element on top of the stack.

      Stack.toList Stack.empty => []

      Stack.empty
        |> Stack.push "foo"
        |> Stack.push "bar"
        |> Stack.toList        => ["bar", "foo"]
-}
toList : Stack a -> List a
toList (Stack _ xs) = xs

{-| Given a list, returns a `Stack` where the top of the stack
    is the head of the list.

      Stack.fromList []        => Stack []

      Stack.fromList [1, 2, 3] => Stack 3 [1, 2, 3]
-}
fromList : List a -> Stack a
fromList xs =
  Stack (List.length xs) xs

{-| Given a `Stack`, returns a `Tuple`.
    The first element is `Just` the element on top of
    the stack or `Nothing` if the stack is empty.
    The second element is a new `Stack` without the top of the stack
    or an empty `Stack` if the given `Stack` was empty.

      Stack.pop Stack.empty     => (Nothing, Stack.empty)

      Stack.fromList [1, 2, 3]
        |> Stack.pop            => (Just 1, Stack 2 [2, 3])
-}
pop : Stack a -> (Maybe a, Stack a)
pop (Stack count xs) =
  case xs of
    [] ->
      (Nothing, empty)

    x :: tail ->
      (Just x, Stack (count - 1) tail)

{-| Given a value `a` and a `Stack a`, push the element onto
    the top of the `Stack`.

      Stack.push "foo" Stack.empty  => Stack 1 ["foo"]

      Stack.fromList ["foo", "bar"]
        |> Stack.push "bazz"        => Stack 3 ["bazz", "foo", "bar"]
-}
push : a -> Stack a -> Stack a
push v (Stack count xs) =
  Stack (count + 1) (v :: xs)

{-| Given a `Stack`, return `Just` the top of the `Stack` or
    `Nothing` if the `Stack` is empty.

      Stack.peek Stack.empty    => Nothing

      Stack.fromList [1, 2, 3]
        |> Stack.peek           => Just 1
-}
peek : Stack a -> Maybe a
peek (Stack _ xs) =
  List.head xs

{-| Given a value `a` and a `Stack a`, check if the value is in the
    `Stack` returning `True` if it is and `False` if it isn't.

      Stack.member "foobar" Stack.empty   => False

      Stack.fromList ["Mon", "Tues", "Wed", "Thurs", "Fri"]
        |> Stack.member "Thurs"           => True
-}
member : a -> Stack a -> Bool
member sought (Stack _ xs) =
  List.member sought xs

{-| Given two Stacks, create a new `Stack` where the second stack is
    appended onto the end of the first `Stack`.

      stack1 = Stack.fromList [1, 2]
      stack2 = Stack.fromList [3, 4]

      Stack.append stack1 stack2    => Stack [1, 2, 3, 4]
-}
append : Stack a -> Stack a -> Stack a
append (Stack xsCount xs) (Stack ysCount ys) =
  List.append xs ys
    |> Stack (xsCount + ysCount)

{-| Given a list of stacks, join them together where the top of the first
    `Stack` in the given list is the top of the returned `Stack`.

      stacks =
        [ Stack.fromList [1, 2]
        , Stack.fromList [3, 4]
        , Stack.fromList [5, 6]
        ]

      Stack.concat stacks      => Stack 6 [1, 2, 3, 4, 5, 6]
-}
concat : List (Stack a) -> Stack a
concat = List.foldr append empty

{-| Given a function `(a -> b)` and a `Stack a` return a new
    `Stack b` with the function applied to every element of the stack. Similar to `List.map`

      Stack.fromList [1, 2, 3]
        |> Stack.map ((+) 1)      => Stack 3 [2, 3, 4]

      Stack.fromList [1, 2, 3]
        |> Stack.map String.fromInt      => Stack 3 ["1", "2", "3"]
-}
map : (a -> b) -> Stack a -> Stack b
map f (Stack count xs) =
  List.map f xs
    |> Stack count


{-| Given a predicate function `(a -> Bool)` and a `Stack a` return a new
    `Stack a` with only the elements in which the predicate function returns `True`. Similar to `List.filter`.

      Stack.fromList [1, 2, 3]
        |> Stack.filter ((<) 1)      => Stack 2 [2, 3]

-}
filter : (a -> Bool) -> Stack a -> Stack a
filter f (Stack _ xs) =
    let
        ( count, newList ) =
            List.foldr
                (\a ( c, items ) ->
                    if f a then
                        ( c + 1, a :: items )

                    else
                        ( c, items )
                )
                ( 0, [] )
                xs
    in
    Stack count newList
