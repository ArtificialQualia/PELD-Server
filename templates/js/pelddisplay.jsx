import React from "react";
import { socket } from "./index";
import { PeldCard, StatEntry } from "./peldcard"
import { character_ship_data } from "./fleetdisplay";
import { DragDropContext, Droppable } from 'react-beautiful-dnd';

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const moveBetween = (list_1, list_2, startIndex, endIndex) => {
  const result_1 = Array.from(list_1);
  const result_2 = Array.from(list_2);
  const [removed] = result_1.splice(startIndex, 1);
  result_2.splice(endIndex, 0, removed);

  return [result_1, result_2];
};

export default class PeldDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { is_dragging: false,
            peld_data: {
              'DPS In': [], 'Cap Damage In': [], 'Logi In': [], 'Cap Transferred': [],
              'DPS Out': [], 'Cap Damage Out': [], 'Logi Out': [], 'Cap Received': []
            },
            cards_left: ["DPS In", "Cap Damage In", "Logi In", "Cap Received"], 
            cards_right: ["DPS Out", "Cap Damage Out", "Logi Out", "Cap Transferred"] 
        };
    this.update = true;
    this.peld_stats = {'dpsIn': [], 'capDamageIn': [], 'logiIn': [], 'capTransfered': [],
                        'dpsOut': [], 'capDamageOut': [], 'logiOut': [], 'capRecieved': []};
    this.peld_formatted = { 'DPS In': [], 'Cap Damage In': [], 'Logi In': [], 'Cap Transferred': [],
                        'DPS Out': [], 'Cap Damage Out': [], 'Logi Out': [], 'Cap Received': []};
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.cleanupStats = this.cleanupStats.bind(this);
    setInterval(this.cleanupStats, 100);
    socket.on('peld_data', (data) => {
      var json_data = JSON.parse(data);
      json_data.entry['time'] = new Date();
      json_data.entry['amount'] = json_data.entry['amount']/10;
      this.peld_stats[json_data.category].push(json_data.entry);
      this.updateStats(json_data.category);
    });
    this.lastRender = 0;
  }

  updateStats(type) {
    if (type == 'dpsIn') {
      this.peld_formatted['DPS In'] = this.updateInStat(type);
    }
    else if (type == 'capDamageIn') {
      this.peld_formatted['Cap Damage In'] = this.updateInStat(type);
    }
    else if (type == 'logiIn') {
      this.peld_formatted['Logi In'] = this.updateInStat(type);
    }
    else if (type == 'capRecieved') {
      this.peld_formatted['Cap Received'] = this.updateInStat(type);
    }
    else if (type == 'dpsOut') {
      this.peld_formatted['DPS Out'] = this.updateOutStat(type);
    }
    else if (type == 'capDamageOut') {
      this.peld_formatted['Cap Damage Out'] = this.updateOutStat(type);
    }
    else if (type == 'logiOut') {
      this.peld_formatted['Logi Out'] = this.updateOutStat(type);
    }
    else if (type == 'capTransfered') {
      this.peld_formatted['Cap Transferred'] = this.updateOutStat(type);
    }
    this.setState({peld_data: this.peld_formatted});
  }

  updateInStat(type) {
    var values = this.peld_stats[type];
    var grouping = {};
    for (var i=0; i < values.length; i++) {
      if (!(values[i].owner in grouping)) {
        grouping[values[i].owner] = {'involved': {}, 'total': 0};
        if (values[i].owner in character_ship_data) {
          grouping[values[i].owner].ship_name = character_ship_data[values[i].owner].ship_name;
          grouping[values[i].owner].ship_id = character_ship_data[values[i].owner].ship_id;
        }
      }
      grouping[values[i].owner].total += values[i].amount;
      if (!(values[i].pilotName in grouping[values[i].owner].involved)) {
        grouping[values[i].owner].involved[values[i].pilotName] = {'weapons': {}, 'total': 0};
        if ('shipType' in values[i] && 'shipTypeId' in values[i]) {
          grouping[values[i].owner].involved[values[i].pilotName].ship_name = values[i].shipType;
          grouping[values[i].owner].involved[values[i].pilotName].ship_id = values[i].shipTypeId;
        }
      }
      grouping[values[i].owner].involved[values[i].pilotName].total += values[i].amount;
      if (!(values[i].weaponType in grouping[values[i].owner].involved[values[i].pilotName].weapons)) {
        grouping[values[i].owner].involved[values[i].pilotName].weapons[values[i].weaponType] = {'total': 0};
      }
      grouping[values[i].owner].involved[values[i].pilotName].weapons[values[i].weaponType].total  += values[i].amount;
    }
    var groupedList = this.sortGroupedStats(grouping);
    return groupedList.map((item, index) => (
      <StatEntry key={item[0]} type={type} name={item[0]} entry={item[1]} />
    ));
  }

  updateOutStat(type) {
    var values = this.peld_stats[type];
    var grouping = {};
    for (var i=0; i < values.length; i++) {
      if (!(values[i].pilotName in grouping)) {
        grouping[values[i].pilotName] = {'involved': {}, 'total': 0};
        if ('shipType' in values[i] && 'shipTypeId' in values[i]) {
          grouping[values[i].pilotName].ship_name = values[i].shipType;
          grouping[values[i].pilotName].ship_id = values[i].shipTypeId;
        }
      }
      grouping[values[i].pilotName].total += values[i].amount;
      if (!(values[i].owner in grouping[values[i].pilotName].involved)) {
        grouping[values[i].pilotName].involved[values[i].owner] = {'weapons': {}, 'total': 0};
        if (values[i].owner in character_ship_data) {
          grouping[values[i].pilotName].involved[values[i].owner].ship_name = character_ship_data[values[i].owner].ship_name;
          grouping[values[i].pilotName].involved[values[i].owner].ship_id = character_ship_data[values[i].owner].ship_id;
        }
      }
      grouping[values[i].pilotName].involved[values[i].owner].total += values[i].amount;
      if (!(values[i].weaponType in grouping[values[i].pilotName].involved[values[i].owner].weapons)) {
        grouping[values[i].pilotName].involved[values[i].owner].weapons[values[i].weaponType] = {'total': 0};
      }
      grouping[values[i].pilotName].involved[values[i].owner].weapons[values[i].weaponType].total  += values[i].amount;
    }
    var groupedList = this.sortGroupedStats(grouping);
    return groupedList.map((item, index) => (
      <StatEntry key={item[0]} type={type} name={item[0]} entry={item[1]} />
    ));
  }

  sortGroupedStats(obj) {
    for (const key of Object.keys(obj)) {
      for (const innerKey of Object.keys(obj[key].involved)) {
        obj[key].involved[innerKey].weapons = this.sortStats(obj[key].involved[innerKey].weapons);
      }
      obj[key].involved = this.sortStats(obj[key].involved);
    }
    obj = this.sortStats(obj);
    return obj;
  }
  
  sortStats(obj) {
    var items = Object.keys(obj).map(function(key) {
      obj[key].total = obj[key].total.toFixed(0)
      return [key, obj[key]];
    });
  
    items.sort(function(first, second) {
    return second[1].total - first[1].total;
    });
  
    return items;
  }

  cleanupStats() {
    for (const key of Object.keys(this.peld_stats)) {
      var changed = false;
      var time = new Date();
      while (this.peld_stats[key].length > 0 && time - this.peld_stats[key][0].time > 10000) {
        changed = true;
        this.peld_stats[key].shift();
      }
      if (changed) {
        this.updateStats(key)
      }
    }
  }

  onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      this.setState({is_dragging: false});
      return;
    }
    var cards_left = this.state.cards_left
    var cards_right = this.state.cards_right

    if (result.source.droppableId == "peld_cards_left" &&
      result.destination.droppableId == "peld_cards_right") {
      var [cards_left, cards_right] = moveBetween(
        this.state.cards_left,
        this.state.cards_right,
        result.source.index,
        result.destination.index
      );
    }
    else if (result.source.droppableId == "peld_cards_right" &&
      result.destination.droppableId == "peld_cards_left") {
      var [cards_right, cards_left] = moveBetween(
        this.state.cards_right,
        this.state.cards_left,
        result.source.index,
        result.destination.index
      );
    }
    else if (result.source.droppableId == "peld_cards_right") {
      cards_right = reorder(
        this.state.cards_right,
        result.source.index,
        result.destination.index
      );
    }
    else if (result.source.droppableId == "peld_cards_left") {
      cards_left = reorder(
        this.state.cards_left,
        result.source.index,
        result.destination.index
      );
    }

    if (cards_left.length == 0) {
      cards_left = cards_right;
      cards_right = [];
    }
    
    this.setState({
      cards_right: cards_right,
      cards_left: cards_left
    });

    this.update = true;
  }

    onDragStart() {
      this.update = false;
    }

    onMouseDown() {
      this.setState({
        is_dragging: true
      });
    }

    onMouseUp() {
      this.setState({
        is_dragging: false
      });
    }

  render () {
    this.lastRender = new Date();
    return (
      <div className="d-flex w-100 h-100 justify-content-between p-1" onMouseUp={this.onMouseUp}>
        <DragDropContext onDragStart={this.onDragStart} onDragEnd={this.onDragEnd} type="PELD_CARD">
          <div className="w-100 h-100" style={{minWidth: '0px'}}>
            <Droppable droppableId="peld_cards_left">
                {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="h-100">
                    {this.state.cards_left.map((item, index) => (
                      <PeldCard index={index} key={item} type={item} onMouseDown={this.onMouseDown}>
                        {this.state.peld_data[item]}
                      </PeldCard>
                    ))}
                    {provided.placeholder}
                </div>
                )}
            </Droppable>
          </div>
          <div className={this.state.cards_right.length > 0 || this.state.is_dragging ? "peld-right-full" : "peld-right-collapse" } >
            <Droppable droppableId="peld_cards_right">
                {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="h-100">
                    {this.state.cards_right.map((item, index) => (
                      <PeldCard index={index} key={item} type={item}>
                        {this.state.peld_data[item]}
                      </PeldCard>
                    ))}
                    {provided.placeholder}
                </div>
                )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>
    );
  }
}
