import { sourcePrefix } from '../../constants/ReactFlowConstants';
import { updateConnectionInput } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import type { ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { isFunctionData } from '../../utils/Function.Utils';
import { Dropdown, SelectableOptionMenuItemType, TextField } from '@fluentui/react';
import type { IDropdownOption, IRawStyle } from '@fluentui/react';
import { Button, makeStyles, Tooltip } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { useDebouncedCallback } from '@react-hookz/web';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const customValueOptionKey = 'customValue';
const customValueDebounceDelay = 300;

export type InputOptions = {
  [key: string]: {
    nodeKey: string;
    nodeName: string;
    isFunctionNode?: boolean;
  }[];
};

export interface InputOptionData {
  isFunction: boolean;
}

const useStyles = makeStyles({
  inputStyles: {
    width: '100%',
  },
});

export interface InputDropdownProps {
  currentNode: SchemaNodeExtended | FunctionData;
  typeMatchedOptions?: IDropdownOption<InputOptionData>[];
  inputValue?: string; // undefined, Node ID, or custom value (string)
  inputIndex: number;
  inputStyles?: IRawStyle;
  label?: string;
  placeholder?: string;
}

export const InputDropdown = (props: InputDropdownProps) => {
  const { currentNode, typeMatchedOptions, inputValue, inputIndex, inputStyles, label, placeholder } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);

  const [isCustomValue, setIsCustomValue] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');

  const customValueOptionLoc = intl.formatMessage({
    defaultMessage: 'Enter custom value',
    description: 'Label for dropdown option to enter custom value',
  });

  const clearCustomValueLoc = intl.formatMessage({
    defaultMessage: 'Clear custom value and reselect',
    description: 'Tooltip content for clearing custom value',
  });

  const onRenderOption = (item?: IDropdownOption) => {
    switch (item?.key) {
      case customValueOptionKey:
        return <span style={{ color: 'rgb(0, 120, 212)' }}>{item?.text}</span>;
      default:
        return <span>{item?.text}</span>;
    }
  };

  const onSelectOption = (option?: IDropdownOption<InputOptionData>) => {
    // Don't do anything if same value
    if (!option || option.key === inputValue) {
      return;
    }

    if (option.key === customValueOptionKey) {
      // NOTE: isCustomValue flag is set in useEffect
      updateInput('');
    } else {
      // Any other selected option will be a node
      validateAndCreateConnection(option);
    }
  };

  const validateAndCreateConnection = (option: IDropdownOption<InputOptionData>) => {
    if (!option.data) {
      console.error('InputDropdown called to create connection with node without necessary data');
      return;
    }

    // If Function node, ensure that new connection won't create loop/circular-logic
    if (isFunctionData(currentNode)) {
      // TODO - ^^
    }

    // Create connection
    const selectedNodeKey = option.key as string;
    const isFunction = option.data.isFunction;
    const sourceKey = isFunction ? selectedNodeKey : `${sourcePrefix}${selectedNodeKey}`;
    const source = isFunction ? functionNodeDictionary[sourceKey] : sourceSchemaDictionary[sourceKey];
    const srcConUnit: ConnectionUnit = {
      node: source,
      reactFlowKey: sourceKey,
    };

    updateInput(srcConUnit);
  };

  const onChangeCustomValue = (newValue?: string) => {
    if (newValue === undefined) {
      return;
    }

    setCustomValue(newValue);
    updateCustomValue(newValue);
  };

  const updateCustomValue = useDebouncedCallback(
    (newValue: string) => {
      updateInput(newValue);
    },
    [],
    customValueDebounceDelay
  );

  const onClearCustomValue = () => {
    setCustomValue('');
    updateInput(undefined);
  };

  const updateInput = (newValue: InputConnection | undefined) => {
    dispatch(updateConnectionInput({ targetNode: currentNode, inputIndex, value: newValue }));
  };

  useEffect(() => {
    // Check if inputValue is defined, and if it's a node reference or a custom value
    if (inputValue !== undefined) {
      const srcSchemaNode = sourceSchemaDictionary[`${sourcePrefix}${inputValue}`];
      const functionNode = functionNodeDictionary[inputValue];

      setIsCustomValue(!srcSchemaNode && !functionNode);
    } else {
      setIsCustomValue(false);
    }
  }, [inputValue, sourceSchemaDictionary, functionNodeDictionary]);

  const modifiedDropdownOptions = useMemo(() => {
    const newModifiedOptions = typeMatchedOptions ? [...typeMatchedOptions] : [];

    // Divider
    newModifiedOptions.push({
      key: 'divider',
      text: '',
      itemType: SelectableOptionMenuItemType.Divider,
    });

    // Custom value option
    newModifiedOptions.push({
      key: customValueOptionKey,
      text: customValueOptionLoc,
    });

    return newModifiedOptions;
  }, [typeMatchedOptions, customValueOptionLoc]);

  return (
    <>
      {!isCustomValue ? (
        <Dropdown
          options={modifiedDropdownOptions}
          selectedKey={inputValue}
          onChange={(_e, option) => onSelectOption(option)}
          label={label}
          placeholder={placeholder}
          className={styles.inputStyles}
          styles={{ root: { ...inputStyles } }}
          onRenderOption={onRenderOption}
        />
      ) : (
        <div style={{ position: 'relative' }}>
          <TextField
            value={customValue}
            onChange={(_e, newValue) => onChangeCustomValue(newValue)}
            label={label}
            placeholder={placeholder}
            className={styles.inputStyles}
            styles={{ root: { ...inputStyles } }}
          />
          <Tooltip relationship="label" content={clearCustomValueLoc}>
            <Button
              appearance="transparent"
              icon={<Dismiss20Regular />}
              onClick={onClearCustomValue}
              style={{
                boxSizing: 'border-box',
                position: 'absolute',
                top: label ? '76%' : '50%',
                right: 0,
                transform: 'translate(0, -50%)',
              }}
            />
          </Tooltip>
        </div>
      )}
    </>
  );
};