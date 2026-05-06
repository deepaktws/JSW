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
      onHeaderCell: () => ({
        style: {
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          minWidth: 140,
        },
      }),
      onCell: () => ({
        style: {
          verticalAlign: 'top',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          minWidth: 140,
        },
      }),
      render: (_, record, rowIndex) => (
        <Input.TextArea
          value={record[col] ?? ''}
          placeholder="—"
          variant="borderless"
          autoSize={{ minRows: 1, maxRows: 24 }}
          style={{ resize: 'vertical', minWidth: 0 }}
          onChange={(e) => onCellChange(sheetIndex, rowIndex, col, e.target.value)}
        />
      ),
    }));
  }, [sheet.columns, sheetIndex, onCellChange]);

  if (sheet.rows.length === 0) {
    return (
      <Text type="secondary" style={{ display: 'block', padding: '16px 0' }}>
        This sheet is empty.
      </Text>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Table
        size="small"
        bordered
        tableLayout="auto"
        pagination={false}
        scroll={{ x: 'max-content' }}
        rowKey={(_, index) => `sheet-${sheetIndex}-row-${index}`}
        columns={tableColumns}
        dataSource={sheet.rows}
      />
    </div>
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
