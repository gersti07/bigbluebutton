import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import PresentationUploaderContainer from '/imports/ui/components/presentation/presentation-uploader/container';
import { withModalMounter } from '/imports/ui/components/modal/service';
import _ from 'lodash';
import { Session } from 'meteor/session';
import Button from '/imports/ui/components/button/component';
import LiveResult from './live-result/component';
import { styles } from './styles.scss';
import DragAndDrop from './dragAndDrop/component';

const intlMessages = defineMessages({
  pollPaneTitle: {
    id: 'app.poll.pollPaneTitle',
    description: 'heading label for the poll menu',
  },
  closeLabel: {
    id: 'app.poll.closeLabel',
    description: 'label for poll pane close button',
  },
  hidePollDesc: {
    id: 'app.poll.hidePollDesc',
    description: 'aria label description for hide poll button',
  },
  customPollLabel: {
    id: 'app.poll.customPollLabel',
    description: 'label for custom poll button',
  },
  startCustomLabel: {
    id: 'app.poll.startCustomLabel',
    description: 'label for button to start custom poll',
  },
  customPollInstruction: {
    id: 'app.poll.customPollInstruction',
    description: 'instructions for using custom poll',
  },
  quickPollInstruction: {
    id: 'app.poll.quickPollInstruction',
    description: 'instructions for using pre configured polls',
  },
  activePollInstruction: {
    id: 'app.poll.activePollInstruction',
    description: 'instructions displayed when a poll is active',
  },
  dragDropPollInstruction: {
    id: 'app.poll.dragDropPollInstruction',
    description: 'instructions for upload poll options via drag and drop',
  },
  ariaInputCount: {
    id: 'app.poll.ariaInputCount',
    description: 'aria label for custom poll input field',
  },
  customPlaceholder: {
    id: 'app.poll.customPlaceholder',
    description: 'custom poll input field placeholder text',
  },
  noPresentationSelected: {
    id: 'app.poll.noPresentationSelected',
    description: 'no presentation label',
  },
  clickHereToSelect: {
    id: 'app.poll.clickHereToSelect',
    description: 'open uploader modal button label',
  },
  tf: {
    id: 'app.poll.tf',
    description: 'label for true / false poll',
  },
  yn: {
    id: 'app.poll.yn',
    description: 'label for Yes / No poll',
  },
  yna: {
    id: 'app.poll.yna',
    description: 'label for Yes / No / Abstention poll',
  },
  a2: {
    id: 'app.poll.a2',
    description: 'label for A / B poll',
  },
  a3: {
    id: 'app.poll.a3',
    description: 'label for A / B / C poll',
  },
  a4: {
    id: 'app.poll.a4',
    description: 'label for A / B / C / D poll',
  },
  a5: {
    id: 'app.poll.a5',
    description: 'label for A / B / C / D / E poll',
  },
});

const MAX_CUSTOM_FIELDS = Meteor.settings.public.poll.max_custom;
const MAX_INPUT_CHARS = 45;

class Poll extends Component {
  constructor(props) {
    super(props);

    this.state = {
      customPollReq: false,
      isPolling: false,
      customPollValues: [],
    };

    this.input = [];
    _.range(0, MAX_CUSTOM_FIELDS).map(() => this.input.push(React.createRef()));


    this.toggleCustomFields = this.toggleCustomFields.bind(this);
    this.renderQuickPollBtns = this.renderQuickPollBtns.bind(this);
    this.renderCustomView = this.renderCustomView.bind(this);
    this.renderInputFields = this.renderInputFields.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleBackClick = this.handleBackClick.bind(this);
  }

  componentDidMount() {
    const { props } = this.hideBtn;
    const { className } = props;

    const hideBtn = document.getElementsByClassName(`${className}`);
    if (hideBtn[0]) hideBtn[0].focus();
  }

  componentDidUpdate() {
    const { amIPresenter } = this.props;

    if (Session.equals('resetPollPanel', true)) {
      this.handleBackClick();
    }

    if (!amIPresenter) {
      Session.set('openPanel', 'userlist');
      Session.set('forcePollOpen', false);
    }
  }

  handleInputChange(index, event) {
    this.handleInputTextChange(index, event.target.value);
  }

  handleInputTextChange(index, text) {
    const { customPollValues } = this.state;
    // This regex will replace any instance of 2 or more consecutive white spaces
    // with a single white space character.
    const option = text.replace(/\s{2,}/g, ' ').trim();

    customPollValues[index] = option === '' ? '' : option;

    this.input[index].current.value = customPollValues[index];

    this.setState({ customPollValues });
  }

  handleBackClick() {
    const { stopPoll } = this.props;
    Session.set('resetPollPanel', false);

    stopPoll();
    this.setState({
      isPolling: false,
      customPollValues: [],
    }, document.activeElement.blur());
  }

  toggleCustomFields() {
    const { customPollReq } = this.state;
    return this.setState({ customPollReq: !customPollReq });
  }

  pushToCustomPollValues(text) {
    const lines = text.split('\n');
    for (let i = 0; i < MAX_CUSTOM_FIELDS; i += 1) {
      let line = '';
      if (i < lines.length) {
        line = lines[i];
        line = line.length > MAX_INPUT_CHARS ? line.substring(0, MAX_INPUT_CHARS) : line;
      }
      this.handleInputTextChange(i, line);
    }
  }

  handlePollValuesText(text) {
    if (text && text.length > 0) {
      this.pushToCustomPollValues(text);
    }
  }

  renderQuickPollBtns() {
    const {
      isMeteorConnected, pollTypes, startPoll, intl,
    } = this.props;

    const btns = pollTypes.map((type) => {
      if (type === 'custom') return false;

      const label = intl.formatMessage(
        // regex removes the - to match the message id
        intlMessages[type.replace(/-/g, '').toLowerCase()],
      );

      return (
        <Button
          disabled={!isMeteorConnected}
          label={label}
          color="default"
          className={styles.pollBtn}
          key={_.uniqueId('quick-poll-')}
          onClick={() => {
            Session.set('pollInitiated', true);
            this.setState({ isPolling: true }, () => startPoll(type));
          }}
        />);
    });

    return btns;
  }

  renderCustomView() {
    const { intl, startCustomPoll } = this.props;
    const { customPollValues } = this.state;
    const isDisabled = _.compact(customPollValues).length < 1;

    return (
      <div className={styles.customInputWrapper}>
        {this.renderInputFields()}
        <Button
          onClick={() => {
            if (customPollValues.length > 0) {
              Session.set('pollInitiated', true);
              this.setState({ isPolling: true }, () => startCustomPoll('custom', _.compact(customPollValues)));
            }
          }}
          label={intl.formatMessage(intlMessages.startCustomLabel)}
          color="primary"
          aria-disabled={isDisabled}
          disabled={isDisabled}
          className={styles.btn}
        />
        {
          this.renderDragDrop()
        }
      </div>
    );
  }

  renderInputFields() {
    const { intl } = this.props;
    // const { customPollValues } = this.state;
    let items = [];

    items = _.range(1, MAX_CUSTOM_FIELDS + 1).map((ele, index) => {
      const id = index;
      return (
        <div key={`custom-poll-${id}`} className={styles.pollInput}>
          <input
            aria-label={intl.formatMessage(
              intlMessages.ariaInputCount, { 0: id + 1, 1: MAX_CUSTOM_FIELDS },
            )}
            placeholder={intl.formatMessage(intlMessages.customPlaceholder)}
            className={styles.input}
            onChange={event => this.handleInputChange(id, event)}
            ref={this.input[id]}
            maxLength={MAX_INPUT_CHARS}
          />
        </div>
      );
    });

    return items;
  }

  renderActivePollOptions() {
    const {
      intl,
      isMeteorConnected,
      stopPoll,
      currentPoll,
      pollAnswerIds,
    } = this.props;

    return (
      <div>
        <div className={styles.instructions}>
          {intl.formatMessage(intlMessages.activePollInstruction)}
        </div>
        <LiveResult
          {...{
            isMeteorConnected,
            stopPoll,
            currentPoll,
            pollAnswerIds,
          }}
          handleBackClick={this.handleBackClick}
        />
      </div>
    );
  }

  renderPollOptions() {
    const { isMeteorConnected, intl } = this.props;
    const { customPollReq } = this.state;

    return (
      <div>
        <div className={styles.instructions}>
          {intl.formatMessage(intlMessages.quickPollInstruction)}
        </div>
        <div className={styles.grid}>
          {this.renderQuickPollBtns()}
        </div>
        <div className={styles.instructions}>
          {intl.formatMessage(intlMessages.customPollInstruction)}
        </div>
        <Button
          disabled={!isMeteorConnected}
          className={styles.customBtn}
          color="default"
          onClick={this.toggleCustomFields}
          label={intl.formatMessage(intlMessages.customPollLabel)}
          aria-expanded={customPollReq}
        />
        {!customPollReq ? null : this.renderCustomView()}
      </div>
    );
  }

  renderNoSlidePanel() {
    const { mountModal, intl } = this.props;
    return (
      <div className={styles.noSlidePanelContainer}>
        <h4>{intl.formatMessage(intlMessages.noPresentationSelected)}</h4>
        <Button
          label={intl.formatMessage(intlMessages.clickHereToSelect)}
          color="primary"
          onClick={() => mountModal(<PresentationUploaderContainer />)}
          className={styles.pollBtn}
        />
      </div>
    );
  }

  renderPollPanel() {
    const { isPolling } = this.state;
    const {
      currentPoll,
      currentSlide,
    } = this.props;

    if (!currentSlide) return this.renderNoSlidePanel();

    if (isPolling || (!isPolling && currentPoll)) {
      return this.renderActivePollOptions();
    }

    return this.renderPollOptions();
  }


  renderDragDrop() {
    const { intl } = this.props;
    return (
      <div>
        <div className={styles.instructions}>
          {intl.formatMessage(intlMessages.dragDropPollInstruction)}
        </div>
        <DragAndDrop
          {...{ intl, MAX_INPUT_CHARS }}
          handlePollValuesText={e => this.handlePollValuesText(e)}
        >
          <div className={styles.dragAndDropPollContainer} />
        </DragAndDrop>
      </div>
    );
  }


  render() {
    const {
      intl,
      stopPoll,
      currentPoll,
      amIPresenter,
    } = this.props;

    if (!amIPresenter) return null;

    return (
      <div>
        <header className={styles.header}>
          <Button
            ref={(node) => { this.hideBtn = node; }}
            tabIndex={0}
            label={intl.formatMessage(intlMessages.pollPaneTitle)}
            icon="left_arrow"
            aria-label={intl.formatMessage(intlMessages.hidePollDesc)}
            className={styles.hideBtn}
            onClick={() => {
              Session.set('openPanel', 'userlist');
            }}
          />

          <Button
            label={intl.formatMessage(intlMessages.closeLabel)}
            aria-label={`${intl.formatMessage(intlMessages.closeLabel)} ${intl.formatMessage(intlMessages.pollPaneTitle)}`}
            onClick={() => {
              if (currentPoll) {
                stopPoll();
              }
              Session.set('openPanel', 'userlist');
              Session.set('forcePollOpen', false);
            }}
            className={styles.closeBtn}
            icon="close"
            size="sm"
            hideLabel
          />

        </header>
        {
          this.renderPollPanel()
        }
      </div>
    );
  }
}

export default withModalMounter(injectIntl(Poll));

Poll.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  amIPresenter: PropTypes.bool.isRequired,
  pollTypes: PropTypes.instanceOf(Array).isRequired,
  startPoll: PropTypes.func.isRequired,
  startCustomPoll: PropTypes.func.isRequired,
  stopPoll: PropTypes.func.isRequired,
};
