import React from "react";
import ReactDOM from 'react-dom';
import { socket } from "./index";

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function StatBadge(props){
    return (
      <div className="my-auto align-center badge badge-secondary ml-1" style={{fontSize: "85%"}}>
        {props.number}
      </div>
    );
}

class StatCard extends React.Component {
  constructor(props) {
      super(props);
  }

  render() {
    var title = ""
    if ( this.props.title ) {
    title = <div className="card-header bg-light p-2"><span className="title-text">{this.props.title}{this.props.number && <StatBadge number={this.props.number} />}</span></div>
    }
    var body = ""
    if ( this.props.body ) {
    body = (
        <div className="card-body bg-light p-2">
        <div className="card-text">
          {this.props.body}
        </div>
        </div>
    );
    }
    return (
        <Draggable draggableId={this.props.title} index={this.props.index}>
            {(provided, snapshot) => {

            const onMouseDown = (() => {
                if (!provided.dragHandleProps) {
                    return onMouseDown;
                }

                return event => {
                    if (["body-text","title-text"].indexOf(event.target.className) < 0 &&
                        ["body-text","title-text"].indexOf(event.target.parentElement.className) < 0) {
                    provided.dragHandleProps.onMouseDown(event);
                    }
                };
                })();

            return (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onMouseDown={onMouseDown} className="card bg-secondary mb-3 text-truncate">
                        {title}
                        {body}
                    </div>
                )}}
        </Draggable>
    );
  }
}

function Location(props) {
    return (
        <span className="body-text">
          {props.location[0]}: <StatBadge number={props.location[1]} />
        </span>
    );
}

class LocationsCard extends React.Component {
    constructor(props) {
        super(props);
    }

    render () {
        var elements = [];
        for (var i=0; i < this.props.locations.length; i++) {
        elements.push(<Location key={this.props.locations[i][0]} location={this.props.locations[i]} />);
        }
        return <StatCard index={this.props.index} title="Locations:" body={elements} />;
    }
}

function Ship(props) {
    return (
        <div>
          <span className="body-text">
          {props.img}{props.ship[0]}: <StatBadge number={props.ship[1]} />
          </span>
        </div>
    );
}

class ShipsCard extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        var elements = [];
        for (var i=0; i < this.props.ships.length; i++) {
        var img = <img height="24px" width="24px" className="mr-1" src={"https://image.eveonline.com/Render/" + this.props.ship_ids[this.props.ships[i][0]] + "_32.png"} />;
        elements.push(<Ship key={this.props.ships[i][0]} ship={this.props.ships[i]} img={img} />);
        }
        return <StatCard index={this.props.index} title="Ship Types:" body={elements} />;
    }
}

function sortDict(dict) {
    var items = Object.keys(dict).map(function(key) {
    return [key, dict[key]];
    });

    items.sort(function(first, second) {
    return second[1] - first[1];
    });

    return items;
}

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

export default class FleetStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = { cards: [], fleet_number: 0, pelds_number: 0, locations: [], ships: [], ship_ids: [] };
    this.update = true;
    socket.on('fleet_update', (data) => {
      if (this.update) {
        this.fleetUpdate(JSON.parse(data));
      }
    });
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
  }

  fleetUpdate(fleet) {
    var fleet_locations = {};
    var fleet_ships = {};
    var fleet_ship_ids = {};
    var fleet_count = 0;
    if ('fleet_commander' in fleet) {
      this.addToStat(fleet_locations, fleet['fleet_commander']['location_name'])
      this.addToStat(fleet_ships, fleet['fleet_commander']['ship_name'])
      fleet_ship_ids[fleet['fleet_commander']['ship_name']] = fleet['fleet_commander']['ship_type_id']
      fleet_count += 1;
    }
    else {
    }
    for (var i=0; i < fleet.wings.length; i++){
      var wing = fleet.wings[i];
      var squads = [];
      if ('wing_commander' in wing) {
        this.addToStat(fleet_locations, wing['wing_commander']['location_name'])
        this.addToStat(fleet_ships, wing['wing_commander']['ship_name'])
        fleet_ship_ids[wing['wing_commander']['ship_name']] = wing['wing_commander']['ship_type_id']
        fleet_count += 1;
      }
      else {
      }
      for (var j=0; j < wing.squads.length; j++) {
        var squad = wing.squads[j];
        var squad_members = [];
        if ('squad_commander' in squad) {
          this.addToStat(fleet_locations, squad['squad_commander']['location_name'])
          this.addToStat(fleet_ships, squad['squad_commander']['ship_name'])
          fleet_ship_ids[squad['squad_commander']['ship_name']] = squad['squad_commander']['ship_type_id']
          fleet_count += 1;
        }
        else {
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            this.addToStat(fleet_locations, squad.members[k]['location_name'])
            this.addToStat(fleet_ships, squad.members[k]['ship_name'])
            fleet_ship_ids[squad.members[k]['ship_name']] = squad.members[k]['ship_type_id']
            fleet_count += 1;
          }
        }
        else {
        }
      }
    }
    fleet_locations = sortDict(fleet_locations);
    fleet_ships = sortDict(fleet_ships);
    if (this.state.cards.length == 0) {
      this.state.cards.push(<StatCard index={0} key="In fleet" title="In fleet: " number={this.state.fleet_number} />);
      this.state.cards.push(<StatCard index={1} key="PELDs Connected" title="PELDs Connected: " number={this.state.pelds_number} />);
      this.state.cards.push(<LocationsCard index={2} key="Locations" locations={this.state.locations} />);
      this.state.cards.push(<ShipsCard index={3} key="Ship Types" ships={this.state.ships} ship_ids={this.state.ship_ids} />);
    }
    if (this.update) {
        this.setState({
            fleet_number: fleet_count,
            pelds_number: "0/"+fleet_count,
            locations: fleet_locations,
            ships: fleet_ships,
            ship_ids: fleet_ship_ids
        });
    }
  }

  addToStat(items, item) {
      if (item in items) {
          items[item] += 1;
      }
      else {
          items[item] = 1;
      }
  }

  onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const cards = reorder(
      this.state.cards,
      result.source.index,
      result.destination.index
    );
    
    this.setState({
      cards: cards
    });

    this.update = true;
  }

  onDragStart() {
    this.update = false;
  }

  render () {
    if ( this.state.cards.length == 0 ) {
      return <div>Getting fleet data...</div>;
    }
    var new_cards = [];
    for (var i=0; i < this.state.cards.length; i++) {
        switch (this.state.cards[i].key) {
            case "In fleet":
              new_cards.push(<StatCard index={i} key="In fleet" title="In fleet: " number={this.state.fleet_number} />);
              break;
            case "PELDs Connected":
              new_cards.push(<StatCard index={i} key="PELDs Connected" title="PELDs Connected: " number={this.state.pelds_number} />);
              break;
            case "Locations":
              new_cards.push(<LocationsCard index={i} key="Locations" locations={this.state.locations} />);
              break;
            case "Ship Types":
              new_cards.push(<ShipsCard index={i} key="Ship Types" ships={this.state.ships} ship_ids={this.state.ship_ids} />);
              break;
            default:
              break;
        }
    }
    this.state.cards = new_cards;
    return (
      <span>
        <div className="w-100 p-1 mb-2 text-center sticky-top border-bottom bg-light border-secondary text-truncate">
            <h5 className="m-0">Fleet Stats</h5>
        </div>
        <div className="p-2">
          <DragDropContext onDragStart={this.onDragStart} onDragEnd={this.onDragEnd} type="FLEET_MEMBER">
            <Droppable droppableId="statDrop">
                {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {this.state.cards}
                  {provided.placeholder}
                </div>
                )}
            </Droppable>
          </DragDropContext>
        </div>
      </span>
    );
  }
}
