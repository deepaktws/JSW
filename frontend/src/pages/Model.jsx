import { Card,Typography } from 'antd'
import React from 'react'
import { ExcelWorkbookView } from '../components/excel/ExcelWorkbookView';
import { useState } from 'react';
const { Title } = Typography;

export const Model = () => {
  const [sheets, setSheets] = useState([]);

//   useEffect(() => {
//     const fetchSheets = async () => {
//       const response = await fetch('/api/excel/upload');
//       const data = await response.json();
//       setSheets(data);
//     }
//     fetchSheets();
//   }, []);
  const hasExcel = sheets.length > 0;
  if (!hasExcel) {
    return (
      <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10 text-center items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Title level={3} className="!mb-1 !text-secondary">No Excel file Found</Title>
        </div>
      </Card>
    )
  }
  return (
    <div>
        <Card className="!rounded-2xl !border-secondary-border/30 !bg-secondary/10">
            <ExcelWorkbookView sheets={sheets} />
          </Card>
    </div>   
  )
}