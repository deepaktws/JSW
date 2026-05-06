import { useCallback, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography, Upload, message } from 'antd';
import { ExcelWorkbookView } from '../components/excel/ExcelWorkbookView';
import { parseExcelWorkbook } from '../utils/parseExcelWorkbook';

const { Text } = Typography;

export function Home() {
  const [parsing, setParsing] = useState(false);
  const [sheets, setSheets] = useState([]);

  const hasExcel = sheets.length > 0;

  const handleBeforeUpload = (file) => {
    void (async () => {
      setParsing(true);
      try {
        const { sheets: nextSheets } = await parseExcelWorkbook(file);
        setSheets(nextSheets);
        const totalRows = nextSheets.reduce((n, s) => n + s.rowCount, 0);
        message.success(`Loaded ${nextSheets.length} sheet(s), ${totalRows} row(s).`);
      } catch (err) {
        message.error(err?.message || 'Could not read that file');
        setSheets([]);
      } finally {
        setParsing(false);
      }
    })();
    return false;
  };

  const updateCell = useCallback((sheetIndex, rowIndex, key, value) => {
    setSheets((prev) =>
      prev.map((s, si) => {
        if (si !== sheetIndex) return s;
        const rows = [...s.rows];
        rows[rowIndex] = { ...rows[rowIndex], [key]: value };
        return { ...s, rows };
      }),
    );
  }, []);

  const handleSendToModel = () => {
    if (!hasExcel) return;
    message.info('Send to model — wire your API here with the current sheet data.');
  };

  return (
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <Upload
          accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          showUploadList={false}
          beforeUpload={handleBeforeUpload}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={parsing}>
            Upload Excel
          </Button>
        </Upload>
        <Button type="default" disabled={!hasExcel} onClick={handleSendToModel}>
          Send to model
        </Button>
      </Space>

      {!hasExcel ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <Text type="secondary" style={{ fontSize: 16 }}>
            Please upload excel
          </Text>
        </div>
      ) : (
        <ExcelWorkbookView sheets={sheets} onCellChange={updateCell} />
      )}
    </Card>
  );
}
