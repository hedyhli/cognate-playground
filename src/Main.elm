module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes exposing (class)
import Html.Events exposing (..)
import Stack exposing (..)

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
  }

init : () -> (Model, Cmd Msg)
init _ =
  ( Model Stack.empty "1 2"
  , Cmd.none
  )

printStack : Stack Int -> String
printStack stack =
    stack |> Stack.map String.fromInt |> Stack.toList |> String.join " "


type Msg
  = Submit
  | TextChange String

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Submit ->
      ( { model | stack = (
        String.split " " model.input
        |> List.map (\x -> Maybe.withDefault 0 (String.toInt x))
        |> Stack.fromList
        ) }
      , Cmd.none
      )
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
    ]
