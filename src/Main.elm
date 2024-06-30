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


type alias Model =
  { stack : Stack Int
  , input : String
  , error : String
  }

init : () -> (Model, Cmd Msg)
init _ =
  ( Model Stack.empty "1 2" "No error"
  , Cmd.none
  )

printStack : Stack Int -> String
printStack stack =
    stack |> Stack.map String.fromInt |> Stack.toList |> List.reverse |> String.join " "

type Msg
  = Submit
  | TextChange String

type StackOp
  = Pop1
  | Pop2
  | Push Int
  | Nop

type StackInOp
  = S (Stack Int)
  | Op StackOp
  | Error String

exeStack1Op : StackInOp -> StackInOp -> StackInOp
exeStack1Op s o =
  case (s, o) of
    (Op op, S stack) ->
      case op of
        Pop1 -> S (Stack.pop stack |> Tuple.second)
        Pop2 -> S (Stack.pop stack |> Tuple.second |> Stack.pop |> Tuple.second)
        Push number -> S (Stack.push number stack)
        Nop -> S (stack)
    (Op _, Error err) -> Error err
    _ -> Error "Internal error during foldl!"

exeStackOps : Stack Int -> List StackOp -> Result String (Stack Int)
exeStackOps stack ops =
  case (List.map Op ops |> List.foldl exeStack1Op (S stack)) of
    S newStack -> Ok newStack
    Op _ -> Err "Internal error after foldl!"
    Error err -> Err err

parseToken : String -> Result String (List StackOp)
parseToken tok =
  case String.toInt tok of
    Just number -> Ok [Push number]
    Nothing -> case tok of
      "x" -> Ok [Pop1]
      "x2" -> Ok [Pop2]
      _ -> Err (String.concat ["Invalid token: ", tok])

unwrapParseResult : (List (Result String StackOp)) -> Result String (List StackOp)
unwrapParseResult parsedTokenResults =
  let
      partitioned = List.partition (
        \res ->
          case res of
            Ok _ -> True
            Err _ -> False
        )
        parsedTokenResults
  in
    case (Tuple.second partitioned |> List.head) of
      Just err -> (Result.map List.singleton err)
      Nothing -> Ok (Tuple.first partitioned |> List.map (Result.withDefault Nop))

parseInput : Model -> Model
parseInput model =
  case (
    String.split " " model.input
    |> List.concatMap (\tok ->
      case (parseToken tok) of
        Ok ops -> List.map Ok ops
        Err error -> [Err error])
    |> unwrapParseResult
    |> Result.andThen (exeStackOps Stack.empty)
    ) of
  Ok newStack -> { model | stack = newStack, error = "No error after parsing" }
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
    [ h1 [] [ text "Cognate playground" ]
    , textarea [onInput TextChange] [ text model.input]
    , button [ onClick Submit ] [ text "Submit" ]
    , div [] [ text (printStack model.stack) ]
    , p [] [ text model.error ]
    ]
