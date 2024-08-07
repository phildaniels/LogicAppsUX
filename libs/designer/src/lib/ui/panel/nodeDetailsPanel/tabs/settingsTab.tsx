import constants from '../../../../common/constants';
import { SettingsPanel } from '../../../settings/';
import type { PanelTabFn } from '@microsoft/designer-ui';

export const settingsTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.SETTINGS,
  title: intl.formatMessage({
    defaultMessage: 'Settings',
    id: 'oMphsh',
    description: 'The tab label for the settings tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Request settings',
    id: '3BXdMk',
    description: 'An accessibility label that describes the settings tab',
  }),
  visible: true,
  content: <SettingsPanel {...props} />,
  order: 2,
});
