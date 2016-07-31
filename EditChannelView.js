import React, { Component, PropTypes } from 'react';
import {
  AsyncStorage,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DragableCell from '../common/DragableCell';
import StaticTextBox from '../common/StaticTextBox';
import TouchableTextBox from '../common/TouchableTextBox';
import TranslateAnimatedView from '../common/TranslateAnimatedView';
import { fetchData } from '../../utils/main';
import { Colors, InitialData, LocalizedStrings, Storages, URLs } from '../../res/main';

const WIDTH = Dimensions.get('window').width;
const LINE_SIZE = 4; // The number of channels per line.
const CELL_WIDTH = WIDTH / LINE_SIZE;
const CELL_HEIGHT = 50;
const SECTION_HEIGHT = 50;
const CELL_NORMAL_BORDER_COLOR = 'rgba(200, 200, 200, 1)';
const CELL_NORMAL_TEXT_COLOR = 'rgba(100, 100, 100, 1)';
const UNSELECTED_SECTION_HEADER_REF = 'unselectedSectionHeaderRef';
export default class EditChannelView extends Component {
  static propTypes = {
    handleSelectCertainChannel: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedChannels: [],
      unselectedChannels: [],
      editing: false,
      activeChannelId: 0,
      viewKey: 0,
    };

    this.initSelectedChannelId();
    this.initChannels();
    this.addedChannels = [];
    this.sortedSelectedChannels = [];

    this.handleEditButtonPress = this.handleEditButtonPress.bind(this);
    this.handleSelectCertainChannel = this.handleSelectCertainChannel.bind(this);
    this.handleAddChannel = this.handleAddChannel.bind(this);
    this.handleRemoveChannel = this.handleRemoveChannel.bind(this);
    this.handleSelectedChannelDragging = this.handleSelectedChannelDragging.bind(this);
    this.handleSelectedChannelDragEnd = this.handleSelectedChannelDragEnd.bind(this);
  }

  async getStorageOfSelectedChannelId() {
    try {
      const stringData = await AsyncStorage.getItem(Storages.selectedNewsChannelId);

      return stringData ? JSON.parse(stringData) : 0;
    }
    catch(error) {
      console.error(error);
      return 0;
    }
  }

  getIndexOfChannel(array, item) {
    let index = -1;
    array.find((channel, i) => {
      if (channel.id === item.id) {
        index = i;
        return true;
      }

      return false;
    });

    return index;
  }

  getChannelRef(channel) {
    return `channel_${channel.id}`;
  }

  async setSelectedChannels(selectedChannels) {
    try {
      this.setState({ selectedChannels });
      this.sortedSelectedChannels = selectedChannels.slice(0);
      await this.setStorageOfSelectedChannels(selectedChannels);
    }
    catch(error) {
      console.error(error);
    }
  }

  async setStorageOfSelectedChannelId(id) {
    try {
      await AsyncStorage.setItem(Storages.selectedNewsChannelId, JSON.stringify(id));
    }
    catch(error) {
      console.error(error);
    }
  }

  async setStorageOfSelectedChannels(channels) {
    try {
      await AsyncStorage.setItem(Storages.channels, JSON.stringify(channels));
    }
    catch(error) {
      console.error(error);
    }
  }

  async initSelectedChannelId() {
    try {
      const activeChannelId = await this.getStorageOfSelectedChannelId();
      this.setState({ activeChannelId });
    }
    catch(error) {
      console.error(error);
    }
  }

  async initChannels() {
    try {
      await this.initSelectedChannels();
      const allChannels = await this.fetchChannels();
      this.cleanDepravedChannels(allChannels);
      this.initUnselectedChannels(allChannels);
    }
    catch(error) {
      console.error(error);
    }
  }

  async initSelectedChannels() {
    try {
      const stringData = await AsyncStorage.getItem(Storages.channels);
      let parsedData = null;
      if (stringData) {
        parsedData = JSON.parse(stringData);
        this.setSelectedChannels(parsedData);
      }
      else {
        // Fetch channels from InitialData.
        await this.setSelectedChannels(InitialData.channels);
      }
    }
    catch(error) {
      console.error(error);
    }
  }

  initUnselectedChannels(allChannels) {
    const unselectedChannels = this.state.unselectedChannels.slice(0);
    for (let i = 0; i < allChannels.length; i++) {
      let selected = false;
      for (let j = 0; j < this.state.selectedChannels.length; j++) {
        if (allChannels[i].id === this.state.selectedChannels[j].id) {
          selected = true;
          break;
        }
      }
      if (!selected) {
        unselectedChannels.push(allChannels[i]);
      }
    }

    this.setState({ unselectedChannels });
  }

  async fetchChannels() {
    try {
      const result = await fetchData(URLs.AllChannels);
      return result ? result.data : [];
    }
    catch(error) {
      console.error(error);
      return [];
    }
  }

  cleanDepravedChannels(allChannels) {
    const selectedChannels = this.state.selectedChannels.slice(0);
    let activeChannelId = this.state.activeChannelId;
    for (let i = 0; i < this.state.selectedChannels.length; i++) {
      let depraved = true;
      for (let j = 0; j < allChannels.length; j++) {
        if (this.state.selectedChannels[i].id === 0 || this.state.selectedChannels[i].id === allChannels[j].id) {
          depraved = false;
          break;
        }
      }
      if (depraved) {
        selectedChannels.splice(i, 1);
        if (this.state.selectedChannels[i].id === this.state.activeChannelId) {
          activeChannelId = 0;
        }
      }
    }

    this.setState({ activeChannelId });
    this.setSelectedChannels(selectedChannels);
  }

  async handleSelectCertainChannel(channel) {
    try {
      await this.setStorageOfSelectedChannelId(channel.id);
      this.props.handleSelectCertainChannel();
    }
    catch(error) {
      console.error(error);
    }
  }

  async handleAddChannel(channel, index) {
    try {
      if (this.isAdding === undefined) {
        this.isAdding = false;
      }
      if (this.isAdding === true) {
        return;
      }
      this.isAdding = true;

      const selectedChannels = this.state.selectedChannels.slice(0);
      const unselectedChannels = this.state.unselectedChannels.slice(0);
      const activeChannelId = this.state.activeChannelId;
      this.addedChannels.push(channel);
      unselectedChannels.splice(index, 1);
      selectedChannels.push(channel);

      await Promise.all([
        this.translateAddingChannel(channel, index),
        this.translateUnSelectedSectionHeaderWhenAdding(),
        this.translateAllUnselectedChannelsWhenAdding(index),
      ]);
      this.forceUpdateWholeView(selectedChannels, unselectedChannels);

      await this.setStorageOfSelectedChannelId(channel.id);
      await this.resetStoragesAfterAddOrRemoveChannel(activeChannelId, selectedChannels);

      this.isAdding = false;
    }
    catch(error) {
      console.error(error);
    }
  }

  async handleRemoveChannel(channel, index) {
    try {
      if (this.isRemoving === undefined) {
        this.isRemoving = false;
      }
      if (this.isRemoving === true) {
        return;
      }
      this.isRemoving = true;

      const selectedChannels = this.state.selectedChannels.slice(0);
      const unselectedChannels = this.state.unselectedChannels.slice(0);
      let activeChannelId = this.state.activeChannelId;
      const oldSelectedChannelsLength = selectedChannels.length;
      selectedChannels.splice(index, 1);
      unselectedChannels.push(channel);

      await Promise.all([
        this.translateRemovingChannel(channel, index),
        this.translateAllSelectedChannelsWhenRemoving(index),
        this.translateUnSelectedSectionHeaderWhenRemoving(),
        this.translateAllUnselectedChannelsWhenRemoving(),
      ]);

      if (channel.id === this.state.activeChannelId) {
        if (index === (oldSelectedChannelsLength - 1)) {
          // Removing the last channel of selected channels.
          activeChannelId = selectedChannels[index - 1].id;
        }
        else {
          activeChannelId = selectedChannels[index].id;
        }
        this.setState({ activeChannelId });
      }

      this.forceUpdateWholeView(selectedChannels, unselectedChannels);

      const indexInAddedChannels = this.getIndexOfChannel(this.addedChannels, channel);
      if (indexInAddedChannels >= 0) {
        this.addedChannels.splice(indexInAddedChannels, 1);
      }

      await this.resetStoragesAfterAddOrRemoveChannel(activeChannelId, selectedChannels);

      this.isRemoving = false;
    }
    catch(error) {
      console.error(error);
    }
  }

  async handleSelectedChannelDragging(channel, index, offset = { dx: 0, dy: 0 }) {
    try {
      if (this.currentDraggingCell === undefined) {
        const { indexX: initialIndexX, indexY: initialIndexY } = this.getIndexXYFromIndex(index);
        this.currentDraggingCell = {
          channelId: channel.id,
          placedIndexX: initialIndexX,
          placedIndexY: initialIndexY,
        };
      }

      if (this.currentDraggingCell.channelId !== channel.id) {
        this.currentDraggingCell.channelId = channel.id;
        return;
      }

      const { left, top } = this.getAbsPosition(index, { left: offset.dx, top: offset.dy });
      const { indexX: newIndexX, indexY: newIndexY } = this.getIndexXYFromAbsPosition({ left, top });
      const oldIndexX = this.currentDraggingCell.placedIndexX;
      const oldIndexY = this.currentDraggingCell.placedIndexY;
      const oldIndex = this.getIndexFromIndexXY(oldIndexX, oldIndexY);
      const newIndex = this.getIndexFromIndexXY(newIndexX, newIndexY);
      if (this.isValidNewIndexXY(newIndexX, newIndexY) &&
        (newIndexX !== this.currentDraggingCell.placedIndexX || newIndexY !== this.currentDraggingCell.placedIndexY)) {
        this.currentDraggingCell.placedIndexX = newIndexX;
        this.currentDraggingCell.placedIndexY = newIndexY;

        if (newIndex > oldIndex) {
          // Insert into back.
          const allTranslate = [];
          for (let i = oldIndex + 1; i <= newIndex; i++) {
            allTranslate.push(this.translateSelectedChannel(i, i - 1, undefined, false));
          }
          await Promise.all(allTranslate);

          // Update sortedSelectedChannels.
          const activeCellRowData = this.sortedSelectedChannels[oldIndex];
          for (let ii = oldIndex; ii < newIndex; ii++) {
            this.sortedSelectedChannels[ii] = this.sortedSelectedChannels[ii + 1];
          }
          this.sortedSelectedChannels[newIndex] = activeCellRowData;
        }
        else {
          // Insert into front.
          const allTranslate = [];
          for (let j = newIndex; j < oldIndex; j++) {
            allTranslate.push(this.translateSelectedChannel(j, j + 1, undefined, false));
          }
          await Promise.all(allTranslate);

          // Update sortedSelectedChannels.
          const activeCellRowData = this.sortedSelectedChannels[oldIndex];
          for (let jj = oldIndex; jj > newIndex; jj--) {
            this.sortedSelectedChannels[jj] = this.sortedSelectedChannels[jj - 1];
          }
          this.sortedSelectedChannels[newIndex] = activeCellRowData;
        }
      }
    }
    catch(error) {
      console.error(error);
    }
  }

  handleSelectedChannelDragEnd() {
    // Force update the whole EditChannelView.
    this.forceUpdateWholeView(this.sortedSelectedChannels);
  }

  handleEditButtonPress() {
    this.setState({ editing: !this.state.editing });
  }

  async resetStoragesAfterAddOrRemoveChannel(activeChannelId, selectedChannels) {
    try {
      if (this.addedChannels.length > 0) {
        await this.setStorageOfSelectedChannelId(
          this.addedChannels[this.addedChannels.length - 1].id);
      }
      else {
        await this.setStorageOfSelectedChannelId(activeChannelId);
      }

      await this.setStorageOfSelectedChannels(selectedChannels);
    }
    catch(error) {
      console.error(error);
    }
  }

  forceUpdateWholeView(selectedChannels, unselectedChannels) {
    this.setSelectedChannels(selectedChannels || this.state.selectedChannels);
    this.setState({
      viewKey: this.state.viewKey + 1,
      unselectedChannels: unselectedChannels || this.state.unselectedChannels,
    });
  }

  getAbsPosition(index, offset = { left: 0, top: 0 }) {
    const { indexX, indexY } = this.getIndexXYFromIndex(index);
    const left = indexX * CELL_WIDTH + offset.left;
    const top = indexY * CELL_HEIGHT + offset.top;
    return { left, top };
  }

  getAbsPositionOfSelectedChannel(index, offset = { left: 0, top: 0 }) {
    return this.getAbsPosition(index, { left: 0 + offset.left, top: SECTION_HEIGHT + offset.top });
  }

  getAbsPositionOfUnselectedChannel(index, offset = { left: 0, top: 0 }) {
    const selectedLineCount = Math.ceil(this.state.selectedChannels.length / LINE_SIZE);
    const topOffset = selectedLineCount * CELL_HEIGHT + 2 * SECTION_HEIGHT;
    return this.getAbsPosition(index, { left: 0 + offset.left, top: topOffset + offset.top });
  }

  getIndexXYFromAbsPosition(position = { left: 0, top: 0 }) {
    const left = position.left + CELL_WIDTH / 2;
    const top = position.top + CELL_HEIGHT / 2;
    const indexX = Math.floor(left / CELL_WIDTH);
    const indexY = Math.floor(top / CELL_HEIGHT);
    return { indexX, indexY };
  }

  getIndexXYFromIndex(index) {
    const indexX = index % LINE_SIZE;
    const indexY = Math.floor(index / LINE_SIZE);
    return { indexX, indexY };
  }

  getIndexFromIndexXY(indexX, indexY) {
    return indexX + indexY * LINE_SIZE;
  }

  isValidNewIndexXY(indexX, indexY) {
    const expectedIndex = this.getIndexFromIndexXY(indexX, indexY);
    const lineCount = Math.ceil(this.state.selectedChannels.length / LINE_SIZE);
    return (expectedIndex > 0) && (expectedIndex < this.state.selectedChannels.length) &&
      indexX >= 0 && indexX < LINE_SIZE && indexY >= 0 && indexY < lineCount;
  }

  async translateSelectedChannel(origIndex, destIndex, destOffset = { left: 0, top: 0 }, spring) {
    try {
      const origPosition = this.getAbsPositionOfSelectedChannel(origIndex, destOffset);
      const destPosition = this.getAbsPositionOfSelectedChannel(destIndex, destOffset);
      const channelRef = this.refs[this.getChannelRef(this.sortedSelectedChannels[origIndex])];
      await channelRef.animatedTranslate(origPosition, destPosition, spring);
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateUnselectedChannel(origIndex, destIndex, destOffset = { left: 0, top: 0 }) {
    try {
      const origPosition = this.getAbsPositionOfUnselectedChannel(origIndex);
      const destPosition = this.getAbsPositionOfUnselectedChannel(destIndex, destOffset);
      const channelRef = this.refs[this.getChannelRef(this.state.unselectedChannels[origIndex])];
      await channelRef.animatedTranslate(origPosition, destPosition);
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateAddingChannel(channel, origIndex) {
    try {
      const origPosition = this.getAbsPositionOfUnselectedChannel(origIndex);
      const destIndex = this.state.selectedChannels.length;
      const destPosition = this.getAbsPositionOfSelectedChannel(destIndex);
      const channelRef = this.refs[this.getChannelRef(channel)];
      await channelRef.animatedTranslate(origPosition, destPosition);
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateUnSelectedSectionHeaderWhenAdding() {
    try {
      if (this.state.selectedChannels.length % LINE_SIZE === 0) {
        const lineCount = this.state.selectedChannels.length / LINE_SIZE;
        const origPosition = { left: 0, top: SECTION_HEIGHT + lineCount * CELL_HEIGHT };
        const destPosition = { left: 0, top: SECTION_HEIGHT + (lineCount + 1) * CELL_HEIGHT };
        const ref = this.refs[UNSELECTED_SECTION_HEADER_REF];
        await ref.animatedTranslate(origPosition, destPosition);
      }
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateAllUnselectedChannelsWhenAdding(addindChannelIndex) {
    try {
      const allPromise = [];
      for (let i = 0; i < addindChannelIndex; i++) {
        if (this.state.selectedChannels.length % LINE_SIZE === 0) {
          allPromise.push(this.translateUnselectedChannel(i, i, { left: 0, top: CELL_HEIGHT }));
        }
        else {
          break;
        }
      }

      for (let j = addindChannelIndex + 1; j < this.state.unselectedChannels.length; j++) {
        if (this.state.selectedChannels.length % LINE_SIZE === 0) {
          allPromise.push(this.translateUnselectedChannel(j, j - 1, { left: 0, top: CELL_HEIGHT }));
        }
        else {
          allPromise.push(this.translateUnselectedChannel(j, j - 1));
        }
      }

      await Promise.all(allPromise);
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateRemovingChannel(channel, index) {
    try {
      const origPosition = this.getAbsPositionOfSelectedChannel(index);
      let destPosition = null;
      const destIndex = this.state.unselectedChannels.length;
      if (this.state.selectedChannels.length % LINE_SIZE === 1) {
        destPosition = this.getAbsPositionOfUnselectedChannel(destIndex, { left: 0, top: -CELL_HEIGHT });
      }
      else {
        destPosition = this.getAbsPositionOfUnselectedChannel(destIndex);
      }
      const channelRef = this.refs[this.getChannelRef(channel)];
      await channelRef.animatedTranslate(origPosition, destPosition);
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateAllSelectedChannelsWhenRemoving(removingChannelIndex) {
    try {
      const allPromise = [];
      for (let i = removingChannelIndex + 1; i < this.state.selectedChannels.length; i++) {
        allPromise.push(this.translateSelectedChannel(i, i - 1));
      }
      await Promise.all(allPromise);
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateUnSelectedSectionHeaderWhenRemoving() {
    try {
      if (this.state.selectedChannels.length % LINE_SIZE === 1) {
        const lineCount = Math.ceil(this.state.selectedChannels.length / LINE_SIZE);
        const origPosition = { left: 0, top: SECTION_HEIGHT + lineCount * CELL_HEIGHT };
        const destPosition = { left: 0, top: SECTION_HEIGHT + (lineCount - 1) * CELL_HEIGHT };
        const ref = this.refs[UNSELECTED_SECTION_HEADER_REF];
        await ref.animatedTranslate(origPosition, destPosition);
      }
    }
    catch(error) {
      console.error(error);
    }
  }

  async translateAllUnselectedChannelsWhenRemoving() {
    try {
      if (this.state.selectedChannels.length % LINE_SIZE !== 1) {
        return;
      }
      const allPromise = [];
      for (let i = 0; i < this.state.unselectedChannels.length; i++) {
        allPromise.push(this.translateUnselectedChannel(i, i, { left: 0, top: - CELL_HEIGHT }));
      }
      await Promise.all(allPromise);
    }
    catch(error) {
      console.error(error);
    }
  }

  renderSelectedSectionHeader() {
    return (
      <View
        style={[
          styles.sectionHeader,
          { position: 'absolute', left: 0, top: 0, right: 0, height: SECTION_HEIGHT },
        ]}
      >
        <Text style={styles.sectionHeaderText}>{LocalizedStrings.switchChannels}</Text>
        <View style={styles.cell}>
          <TouchableTextBox
            text={this.state.editing ?
              LocalizedStrings.finish : LocalizedStrings.manageChannels}
            width={CELL_WIDTH}
            height={CELL_HEIGHT}
            fontSize={13}
            borderColor={'rgba(254, 46, 46, 1)'}
            textColor={'rgba(254, 46, 46, 1)'}
            handlePress={this.handleEditButtonPress}
          />
        </View>
      </View>
    );
  }

  renderSelectedChannels() {
    return this.state.selectedChannels.map((channel, index) => this.renderSelectedChannel(channel, index));
  }

  renderSelectedChannel(channel, index) {
    const { left, top } = this.getAbsPositionOfSelectedChannel(index);
    const CellElement = this.state.editing ? StaticTextBox : TouchableTextBox;
    let borderColor = 'rgba(0, 0, 0, 0)';
    if (channel.id !== 0) {
      borderColor = this.state.activeChannelId === channel.id ? Colors.themeColor : CELL_NORMAL_BORDER_COLOR;
    }

    return (
      <DragableCell
        key={channel.id}
        ref={this.getChannelRef(channel)}
        position={'absolute'}
        left={left}
        top={top}
        width={CELL_WIDTH}
        height={CELL_HEIGHT}
        zIndex={1}
        shouldSetResponder={channel.id !== 0 && this.state.editing}
        onClicked={() => this.handleRemoveChannel(channel, index)}
        onDragging={offset => this.handleSelectedChannelDragging(channel, index, offset)}
        onDragingTerminate={() => this.handleSelectedChannelDragEnd()}
        onDragEnd={() => this.handleSelectedChannelDragEnd()}
      >
        <CellElement
          text={channel.name}
          width={CELL_WIDTH}
          height={CELL_HEIGHT}
          fontSize={15}
          textColor={(this.state.activeChannelId === channel.id) ?
            Colors.themeColor : CELL_NORMAL_TEXT_COLOR}
          borderColor={borderColor}
          handlePress={!this.state.editing ? () => this.handleSelectCertainChannel(channel) : null}
          displayRemoveIcon={channel.id !== 0 ? this.state.editing : false}
        />
      </DragableCell>
    );
  }

  renderUnSelectedSectionHeader() {
    const top = SECTION_HEIGHT + CELL_HEIGHT * Math.ceil(this.state.selectedChannels.length / LINE_SIZE);
    return (
      <TranslateAnimatedView
        ref={UNSELECTED_SECTION_HEADER_REF}
        containerStyle={[
          styles.sectionHeader,
          { position: 'absolute', left: 0, top, right: 0, height: SECTION_HEIGHT },
        ]}
      >
        <View style={styles.unselectedSectionHeaderContainer}>
          <Text style={styles.sectionHeaderText}>
            {LocalizedStrings.clickToAddMoreChannels}
          </Text>
        </View>
      </TranslateAnimatedView>
    );
  }

  renderUnselectedChannels() {
    return this.state.unselectedChannels.map((channel, index) => this.renderUnselectedChannel(channel, index));
  }

  renderUnselectedChannel(channel, index) {
    const { left, top } = this.getAbsPositionOfUnselectedChannel(index);
    return (
      <DragableCell
        key={channel.id}
        ref={this.getChannelRef(channel)}
        position={'absolute'}
        left={left}
        top={top}
        width={CELL_WIDTH}
        height={CELL_HEIGHT}
        zIndex={1}
        shouldSetResponder={false}
      >
        <TouchableTextBox
          text={channel.name}
          width={CELL_WIDTH}
          height={CELL_HEIGHT}
          fontSize={15}
          textColor={CELL_NORMAL_TEXT_COLOR}
          borderColor={CELL_NORMAL_BORDER_COLOR}
          handlePress={() => this.handleAddChannel(channel, index)}
        />
      </DragableCell>
    );
  }

  render() {
    return (
      <View key={this.state.viewKey} style={styles.editChannelView}>
        {this.renderSelectedSectionHeader()}
        {this.renderSelectedChannels()}
        {this.renderUnSelectedSectionHeader()}
        {this.renderUnselectedChannels()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  editChannelView: {
    flex: 1,
    alignSelf: 'stretch',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderText: {
    marginLeft: 10,
    fontSize: 15,
    color: 'rgba(50, 50, 50, 1)',
  },
  unselectedSectionHeaderContainer: {
    marginVertical: 10,
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(230, 230, 230, 1)',
    justifyContent: 'center',
  },
});
