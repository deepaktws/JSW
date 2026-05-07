import { useCallback, useMemo } from 'react';
import { Input, Table, Tabs, Typography } from 'antd';

const { Text } = Typography;

function EditableSheetTable({ sheetIndex, sheet, onCellChange }) {
  const tableColumns = useMemo(() => {
    if (!sheet.columns?.length) return [];
    return sheet.columns.map((col, colIndex) => ({
      title: col || `(Column ${colIndex + 1})`,
      dataIndex: col,
      key: `${String(col)}-${colIndex}`,
      onHeaderCell: () => ({ className: '!whitespace-normal break-words min-w-[140px]' }),
      onCell: () => ({ className: 'align-top !whitespace-normal break-words min-w-[140px]' }),
      render: (_, record, rowIndex) => (
        <Input.TextArea
          value={record[col] ?? ''}
          placeholder="—"
          variant="borderless"
          autoSize={{ minRows: 1, maxRows: 24 }}
          className="min-w-0 resize-y"
          onChange={(e) => onCellChange(sheetIndex, rowIndex, col, e.target.value)}
        />
      ),
    }));
  }, [sheet.columns, sheetIndex, onCellChange]);

  if (sheet.rows.length === 0) {
    return (
      <Text type="secondary" className="block py-4">
        This sheet is empty.
      </Text>
    );
  }

  return (
    <Table
      size="small"
      bordered
      tableLayout="auto"
      pagination={false}
      rowKey={(_, index) => `sheet-${sheetIndex}-row-${index}`}
      columns={tableColumns}
      dataSource={sheet.rows}
    />
  );
}

/**
 * Tabs + editable tables for parsed workbook sheets.
 */
export function ExcelWorkbookView({ sheets, onCellChange }) {
  const tabItems = useMemo(
    () =>
      sheets.map((sheet, index) => ({
        key: `sheet-${index}-${sheet.sheetName}`,
        label: `${sheet.sheetName} (${sheet.rowCount})`,
        children: (
          <EditableSheetTable sheetIndex={index} sheet={sheet} onCellChange={onCellChange} />
        ),
      })),
    [sheets, onCellChange],
  );

  if (!sheets.length) return null;

  return <Tabs defaultActiveKey={tabItems[0]?.key} items={tabItems} />;
}
