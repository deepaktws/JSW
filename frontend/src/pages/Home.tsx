import { useCallback, useState } from 'react';
import { FileExcelOutlined, PlayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { ExcelWorkbookView } from '../components/excel/ExcelWorkbookView';
import { parseExcelWorkbook, type ParsedSheet } from '../utils/parseExcelWorkbook';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { uploadFileInChunks } from '../services/chunkUpload';
const { Text, Title } = Typography;

export function Home() {
  const [parsing, setParsing] = useState(false);
  const [runningModel, setRunningModel] = useState(false);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const hasExcel = sheets.length > 0;
  const totalRows = sheets.reduce((count, sheet) => count + sheet.rowCount, 0);

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    void (async () => {
      setParsing(true);
      try {
        setExcelFile(file as File);
        const { sheets: nextSheets } = await parseExcelWorkbook(file as File);
        setSheets(nextSheets);
        const nextTotalRows = nextSheets.reduce((n, s) => n + s.rowCount, 0);
        message.success(`Loaded ${nextSheets.length} sheet(s), ${nextTotalRows} row(s).`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not read that file';
        message.error(msg);
        setSheets([]);
        setExcelFile(null);
      } finally {
        setParsing(false);
      }
    })();
    return false;
  };

  const updateCell = useCallback(
    (sheetIndex: number, rowIndex: number, key: string, value: string) => {
      setSheets((prev) =>
        prev.map((s, si) => {
          if (si !== sheetIndex) return s;
          const rows = [...s.rows];
          rows[rowIndex] = { ...rows[rowIndex], [key]: value };
          return { ...s, rows };
        }),
      );
    },
    [],
  );

  const handleSendToModel = () => {
    if (!hasExcel || !excelFile) return;
    if (!token) {
      message.error('Please login to run the model.');
      return;
    }

    (async () => {
      setRunningModel(true);
      const uploadToastKey = `upload-${crypto.randomUUID()}`;
      message.open({ key: uploadToastKey, type: 'loading', content: 'Uploading file…', duration: 0 });
      try {
        const result = await uploadFileInChunks({
          file: excelFile,
          token,
          chunkSizeBytes: 256 * 1024,
          onProgress: ({ percentage }) => {
            message.open({
              key: uploadToastKey,
              type: 'loading',
              content: `Uploading file… ${percentage}%`,
              duration: 0,
            });
          },
        });

        if (!result.completed) {
          message.open({
            key: uploadToastKey,
            type: 'warning',
            content: 'Upload did not complete. Please try again.',
            duration: 2,
          });
          return;
        }

        message.open({ key: uploadToastKey, type: 'success', content: 'Upload complete.', duration: 1.5 });
        navigate('/model', { state: { fileId: result.fileId } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        message.open({ key: uploadToastKey, type: 'error', content: msg, duration: 3 });
      } finally {
        setRunningModel(false);
      }
    })();
  };

  return (
    <div className="space-y-5">
      <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={3} className="!mb-1 !text-secondary">
              Excel Playground
            </Title>
            <Text className="!text-secondary/70">
              Upload an Excel file, review parsed sheets, edit values, and run your model.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Upload
              accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              showUploadList={false}
              beforeUpload={handleBeforeUpload}
            >
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={parsing}
                className="!border-primary !bg-primary !text-primary-foreground hover:!border-primary/90 hover:!bg-primary/90"
              >
                Upload Excel
              </Button>
            </Upload>
            <Button
              type="default"
              icon={<PlayCircleOutlined />}
              disabled={!hasExcel || !excelFile || runningModel}
              onClick={handleSendToModel}
              loading={runningModel}
              className="!border-secondary-border !text-secondary disabled:!text-secondary/40"
            >
              Run Model
            </Button>
          </div>
        </div>
      </Card>

      {!hasExcel ? (
        <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10 ">
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-secondary/30 bg-secondary/5 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <FileExcelOutlined className="text-2xl" />
            </div>
            <Title level={4} className="!mb-1 !text-secondary">
              No workbook loaded
            </Title>
            <Text className="!text-secondary/70">
              Upload a `.xlsx` or `.xls` file to start reviewing and editing rows.
            </Text>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10">
              <Text className="!text-secondary/70">{sheets.length>1 ? "Sheets" : "Sheet"}</Text>
              <Title level={4} className="!mb-0 !mt-1 !text-secondary">
                {sheets.length}
              </Title>
            </Card>
            <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10">
              <Text className="!text-secondary/70">{totalRows>1 ? "Rows" : "Row"}</Text>
              <Title level={4} className="!mb-0 !mt-1 !text-secondary">
                {totalRows}
              </Title>
            </Card>
          </div>
          <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10">
            <ExcelWorkbookView sheets={sheets} onCellChange={updateCell} />
          </Card>
        </>
      )}
    </div>
  );
}

