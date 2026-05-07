import { useMemo } from 'react';
import { Input, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ParsedSheet, ParsedSheetRow } from '../../utils/parseExcelWorkbook';

const { Text } = Typography;

type ExcelWorkbookViewProps = {
  sheets: ParsedSheet[];
  onCellChange: (sheetIndex: number, rowIndex: number, key: string, value: string) => void;
};

function EditableSheetTable({
  sheetIndex,
  sheet,
  onCellChange,
}: {
  sheetIndex: number;
  sheet: ParsedSheet;
  onCellChange: ExcelWorkbookViewProps['onCellChange'];
}) {
  const tableColumns: ColumnsType<ParsedSheetRow> = useMemo(() => {
    if (!sheet.columns?.length) return [];
    return sheet.columns.map((col, colIndex) => ({
      title: col || `(Column ${colIndex + 1})`,
      dataIndex: col,
      key: `${String(col)}-${colIndex}`,
      onHeaderCell: () => ({ className: '!whitespace-normal break-words min-w-[140px]' }),
      onCell: () => ({ className: 'align-top !whitespace-normal break-words min-w-[140px]' }),
      render: (_: unknown, record: ParsedSheetRow, rowIndex?: number) => (
        <Input.TextArea
          value={record[col] ?? ''}
          placeholder="—"
          variant="borderless"
          autoSize={{ minRows: 1, maxRows: 24 }}
          className="min-w-0 resize-y"
          onChange={(e) => onCellChange(sheetIndex, rowIndex ?? 0, col, e.target.value)}
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
    <div className="w-full overflow-x-auto">
      <Table<ParsedSheetRow>
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
export function ExcelWorkbookView({ sheets, onCellChange }: ExcelWorkbookViewProps) {
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

