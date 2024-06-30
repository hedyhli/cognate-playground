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

exeStack1Op : StackInOp -> StackInOp -> StackInOp
exeStack1Op s o =
  case (s, o) of
    (Op op, S stack) ->
      case op of
        Pop1 -> S (Stack.pop stack |> Tuple.second)
        Pop2 -> S (Stack.pop stack |> Tuple.second |> Stack.pop |> Tuple.second)
        Push number -> S (Stack.push number stack)
        Nop -> S (stack)
    _ -> S (Stack.fromList [0])

exeStackOps : Stack Int -> List StackOp -> Stack Int
exeStackOps stack ops =
  case (List.map Op ops |> List.foldl exeStack1Op (S stack)) of
    S newStack -> newStack
    _ -> Stack.fromList [0, 0]

parseToken : String -> Result String (List StackOp)
parseToken tok =
  case String.toInt tok of
    Just number -> Ok [Push number]
    Nothing -> case tok of
      "x" -> Ok [Pop1]
      "x2" -> Ok [Pop2]
      _ -> Err "invalid token"

parseInput : Model -> Result String Model
parseInput model =
  Ok { model
  | stack = (
    String.split " " model.input
    |> List.concatMap (\tok -> case parseToken tok of
    Ok stackOpt -> stackOpt
    Err _ -> [Nop]) -- Error during parsing
    |> exeStackOps Stack.empty
    )
  }

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Submit ->
      case parseInput model of
        Ok newModel -> (newModel, Cmd.none)
        Err error -> ({ model | error = "There was an error!" }, Cmd.none)
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
