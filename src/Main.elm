module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes exposing (class)
import Html.Events exposing (..)
import Stack exposing (..)

main : Program () Model Msg
main =
  Browser.element
    { init = init
    , update = update
    , subscriptions = subscriptions
    , view = view
    }

type alias TheStack = Stack Int
type alias StackOperator = TheStack -> Result String TheStack

type alias Model =
  { stack : TheStack
  , input : String
  , error : List String
  }

init : () -> (Model, Cmd Msg)
init _ =
  ( Model Stack.empty "" []
  , Cmd.none
  )

printStack : TheStack -> String
printStack stack =
    stack |> Stack.map String.fromInt |> Stack.toList |> List.reverse |> String.join " "

type Msg
  = Submit
  | TextChange String

type StackInOp
  = S TheStack
  | Op StackOperator
  | Error String

exeStack1Op : StackInOp -> StackInOp -> StackInOp
exeStack1Op s o =
  case (s, o) of
    (Op op, S stack) ->
      case op stack of
        Ok newStack -> S newStack
        Err error -> Error error
    (Op _, Error err) -> Error err
    _ -> Error "Internal error during foldl!"

opPush : Int -> TheStack -> Result String TheStack
opPush new stack = Stack.push new stack |> Ok

opNop : StackOperator
opNop stack = Ok stack

get2Operands : String -> (Int -> Int -> Int) -> StackOperator
get2Operands opName fn stack =
  let
      first = Stack.pop stack
      second = Stack.pop (Tuple.second first)
      a = Tuple.first first
      b = Tuple.first second
  in
    case (a, b) of
      (Just opr1, Just opr2) -> Stack.push (fn opr2 opr1) (Tuple.second second) |> Ok
      (Just opr1, Nothing) ->
        String.concat
        [ "Too few operands for '"
        , opName
        , "' operation. "
        , "First operand is "
        , String.fromInt opr1
        , ", second operand not found."
        ] |> Err
      _ -> String.concat ["Not enough operands for '", opName, "' operation (exactly 2 needed)"] |> Err

opAdd : StackOperator
opAdd stack = get2Operands "+" (+) stack

opSub : StackOperator
opSub stack = get2Operands "-" (-) stack

opMult : StackOperator
opMult stack = get2Operands "*" (*) stack

exeStackOps : TheStack -> List StackOperator -> Result (List String) TheStack
exeStackOps stack ops =
  case (List.map Op ops |> List.foldl exeStack1Op (S stack)) of
    S newStack -> Ok newStack
    Op _ -> Err ["Internal error after foldl!"]
    Error err -> Err [String.concat ["Error during eval: ", err]]

parseToken : String -> Result String StackOperator
parseToken tok =
  case String.toInt tok of
    Just number -> Ok (opPush number)
    Nothing -> case tok of
      "+" -> Ok opAdd
      "-" -> Ok opSub
      "*" -> Ok opMult
      "" -> Ok opNop
      " " -> Ok opNop
      _ -> Err (String.concat ["Invalid token: '", tok, "'"])

unwrapParseResult : (List (Result String StackOperator)) -> Result (List String) (List StackOperator)
unwrapParseResult parsedTokenResults =
  let
      partitioned = List.partition (
        \res ->
          case res of
            Ok _ -> True
            Err _ -> False
        )
        parsedTokenResults

      errors = Tuple.second partitioned
  in
    if List.length errors > 0 then
      (errors |> List.map (\x ->
        case x of
          Err e -> e
          _ -> ""
        ) |> Err)
    else Ok (Tuple.first partitioned |> List.map (Result.withDefault opNop))

parseInput : Model -> Model
parseInput model =
  case (
    String.split " " model.input
    |> List.map parseToken
    |> unwrapParseResult
    |> Result.andThen (exeStackOps Stack.empty)
    ) of
  Ok newStack -> { model | stack = newStack, error = [] }
  Err error -> { model | stack = Stack.empty, error = error }

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Submit -> (parseInput model, Cmd.none)
    TextChange s ->
      ( { model | input = s }
      , Cmd.none
      )


subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.none

view : Model -> Html Msg
view model =
  div []
    [ input [onInput TextChange] [ text model.input]
    , button [ onClick Submit ] [ text "Submit" ]
    , (if Stack.isEmpty model.stack then p [] [] else pre [] [ code [] [text (printStack model.stack) ] ])
    , p (if List.length model.error > 0 then [class "notice"] else []) [ ol [] (List.map (\e -> li [] [ text e ]) model.error) ]
    ]
