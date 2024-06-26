import { getChildrenNodes } from '../../../editor/base/utils/helper';
import { parseHtmlSegments, parseSegments } from '../../../editor/base/utils/parsesegments';
import clockWiseArrowDark from '../icons/dark/arrow-clockwise.svg';
import counterClockWiseArrowDark from '../icons/dark/arrow-counterclockwise.svg';
import codeToggleDark from '../icons/dark/code-toggle.svg';
import clockWiseArrowLight from '../icons/light/arrow-clockwise.svg';
import counterClockWiseArrowLight from '../icons/light/arrow-counterclockwise.svg';
import codeToggleLight from '../icons/light/code-toggle.svg';
import { BlockFormatDropDown } from './DropdownBlockFormat';
import { Format } from './Format';
import { CLOSE_DROPDOWN_COMMAND } from './helper/Dropdown';
import { FontDropDown, FontDropDownType } from './helper/FontDropDown';
import { convertEditorState } from './helper/HTMLChangePlugin';
import { css, useTheme } from '@fluentui/react';
import { Toolbar, ToolbarButton, ToolbarDivider, ToolbarGroup } from '@fluentui/react-components';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListNode, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $isHeadingNode } from '@lexical/rich-text';
import { $getSelectionStyleValueForProperty } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import type { ValueSegment } from '@microsoft/logic-apps-shared';
import { isApple } from '@microsoft/logic-apps-shared';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export const blockTypeToBlockName = {
  bullet: 'Bullet List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
} as const;
export type blockTypeToBlockName = (typeof blockTypeToBlockName)[keyof typeof blockTypeToBlockName];

interface ToolbarProps {
  isRawText?: boolean;
  isSwitchFromPlaintextBlocked?: boolean;
  readonly?: boolean;
  setIsRawText?: (newValue: boolean) => void;
}

export const RichTextToolbar = ({ isRawText, isSwitchFromPlaintextBlocked, readonly = false, setIsRawText }: ToolbarProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const { isInverted } = useTheme();
  const intl = useIntl();

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fontSize, setFontSize] = useState<string>('15px');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [blockType, setBlockType] = useState<keyof typeof blockTypeToBlockName>('paragraph');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    // Currently a bug affecting the tool due to $getSelection https://github.com/facebook/lexical/issues/4011
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
      setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '15px'));
    }
  }, [activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      activeEditor.registerCommand<boolean>(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_NORMAL
      )
    );
  }, [editor, activeEditor, updateToolbar]);

  // close dropdowns when panel is scrolled
  useEffect(() => {
    function handleScroll() {
      activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
    }

    const scrollableContent = document.querySelector('.ms-Panel-scrollableContent');
    if (scrollableContent) {
      scrollableContent.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollableContent) {
        scrollableContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeEditor]);

  const toggleCodeViewMessage = intl.formatMessage({
    defaultMessage: 'Toggle code view',
    id: 'gA1dde',
    description: 'Label used for the toolbar button which switches between raw HTML (code) view and WYSIWIG (rich text) view',
  });

  const formattingButtonsDisabled = readonly || !!isRawText;

  return (
    <Toolbar className="msla-html-editor-toolbar">
      <ToolbarGroup className="msla-html-editor-toolbar-group" role="presentation">
        <ToolbarButton
          disabled={!canUndo || readonly}
          onClick={() => {
            activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
            activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
          }}
          title={isApple() ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
          className="toolbar-item"
          aria-label="Undo"
          icon={
            <img
              className={'format'}
              src={isInverted ? counterClockWiseArrowDark : counterClockWiseArrowLight}
              alt={'counter clockwise arrow'}
            />
          }
        />
        <ToolbarButton
          disabled={!canRedo || readonly}
          onClick={() => {
            activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
            activeEditor.dispatchCommand(REDO_COMMAND, undefined);
          }}
          title={isApple() ? 'Redo (⌘Y)' : 'Redo (Ctrl+Y)'}
          className="toolbar-item"
          aria-label="Redo"
          icon={<img className={'format'} src={isInverted ? clockWiseArrowDark : clockWiseArrowLight} alt={'clockwise arrow'} />}
        />
        <ToolbarDivider className="msla-toolbar-divider" />
        <BlockFormatDropDown disabled={formattingButtonsDisabled} blockType={blockType} editor={editor} />
        <FontDropDown
          fontDropdownType={FontDropDownType.FONTFAMILY}
          value={fontFamily}
          editor={editor}
          disabled={formattingButtonsDisabled}
        />
        <FontDropDown fontDropdownType={FontDropDownType.FONTSIZE} value={fontSize} editor={editor} disabled={formattingButtonsDisabled} />
        <ToolbarDivider className="msla-toolbar-divider" />
        <Format activeEditor={activeEditor} readonly={formattingButtonsDisabled} />
      </ToolbarGroup>
      {setIsRawText ? (
        <ToolbarGroup className="msla-html-editor-toolbar-group" role="presentation">
          <ToolbarButton
            aria-label="Raw code toggle"
            className={css('toolbar-item', isRawText && 'active')}
            disabled={readonly || (isRawText && isSwitchFromPlaintextBlocked)}
            icon={<img className={'format'} src={isInverted ? codeToggleDark : codeToggleLight} alt={'code view'} />}
            onClick={() => {
              const nodeMap = new Map<string, ValueSegment>();
              activeEditor.getEditorState().read(() => {
                getChildrenNodes($getRoot(), nodeMap);
              });
              convertEditorState(activeEditor, nodeMap, { isValuePlaintext: !!isRawText }).then((valueSegments) => {
                activeEditor.update(() => {
                  $getRoot().clear().select();
                  if (isRawText) {
                    parseHtmlSegments(valueSegments, { tokensEnabled: true, readonly });
                    setIsRawText(false);
                  } else {
                    parseSegments(valueSegments, { tokensEnabled: true, readonly });
                    setIsRawText(true);
                  }
                });
              });
            }}
            title={toggleCodeViewMessage}
          />
        </ToolbarGroup>
      ) : null}
      <ListPlugin />
      <LinkPlugin />
    </Toolbar>
  );
};
