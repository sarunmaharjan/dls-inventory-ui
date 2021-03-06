import {Component, OnInit} from '@angular/core';
import {MessageService, SelectItem} from "primeng/api";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {InventoryService} from "../inventory.service";
import {StudentService} from "../student.service";
import * as XLSX from "xlsx";

@Component({
  selector: 'app-inventory-management',
  templateUrl: './inventory-management.component.html',
  styleUrls: ['./inventory-management.component.css']
})
export class InventoryManagementComponent implements OnInit {

  constructor(private inventoryService: InventoryService, private studentService: StudentService, private messageService: MessageService) {
  }

  inventoryList: any;
  inventoryId: number;
  cols: any[];
  inventoryHistoryCols: any[];

  enableInventoryPopup: boolean = false;
  enableInventoryDeletePopup: boolean = false;
  showStatusDropdown: boolean = false;
  enableUploadForm: boolean = false;

  inventoryModalTitle: string = "Loading..";
  processMessage: string;

  submitted = false;
  statusList: SelectItem[]; // pop up dropdown
  statusListFilter: SelectItem[]; // table filter dropdown

  //Student
  assignedStudent = {};
  enableInventoryAssignment: boolean = false;
  enableInventoryManagement: boolean = false;
  enableInventoryRepair: boolean = false;

  inventoryHistoryList: any[] = [];

  studentList: SelectItem[] = [];

  inventoryForm = new FormGroup({
    laptopSn: new FormControl('', Validators.required),
    powerAdapterSn: new FormControl('', Validators.required),
    statusSelect: new FormControl('SPARE')
  });

  inventoryHistoryForm = new FormGroup({
    comments: new FormControl('')
  });

  inventoryAssignForm = new FormGroup({
    student: new FormControl('', Validators.required)
  });

  inventoryRepairForm = new FormGroup({
    comments: new FormControl('', Validators.required)
  });

  uploadForm = new FormGroup({
    file: new FormControl(null, Validators.required)
  })

  get registerFormControl() {
    return this.inventoryForm.controls;
  }

  ngOnInit(): void {
    this.getAllInventories();
    this.cols = [
      {field: 'laptopSn', header: 'Laptop SN'},
      {field: 'powerAdapterSn', header: 'Power Adapter SN'},
      {field: 'status', header: 'Status'}
    ];

    this.statusList = [
      {label: 'SPARE', value: 'SPARE'},
      {label: 'IN_USE', value: 'IN_USE'},
      {label: 'IN_REPAIR', value: 'IN_REPAIR'},
    ];

    this.statusListFilter = [
      {label: 'All', value: null},
      {label: 'SPARE', value: 'SPARE'},
      {label: 'IN_USE', value: 'IN_USE'},
      {label: 'IN_REPAIR', value: 'IN_REPAIR'},
    ];

    this.inventoryHistoryCols = [
      {field: 'createdDate', header: 'Activity Date'},
      {field: 'comments', header: 'Comments'},

    ];

  }

  private getAllInventories() {
    this.inventoryService.getAllInventories().then((data: Array<any>) => {
      this.inventoryList = data["inventoryList"];
      console.log(this.inventoryList)
    }).catch(data => {
      console.log(data);
    });
  }

  onEditInventoryClicked(rowData) {
    this.inventoryModalTitle = "Edit Inventory"
    this.showStatusDropdown = true;
    console.log(rowData);
    this.inventoryId = rowData.inventoryId;
    const statusSelect = {label: rowData.status, value: rowData.status}
    this.inventoryForm.patchValue({
      laptopSn: rowData.laptopSn,
      powerAdapterSn: rowData.powerAdapterSn,
      statusSelect: statusSelect
    });
    this.enableInventoryPopup = true;
  }

  onAddInventoryClicked() {
    this.showStatusDropdown = false;
    this.inventoryForm.reset();
    this.submitted = false;
    this.inventoryModalTitle = 'Add Inventory';
    this.enableInventoryPopup = true;
  }

  addOrEditInventory() {
    console.log(this.inventoryForm.value);
    this.submitted = true;
    const inventoryRecord = Object.assign({}, this.inventoryForm.value);
    console.log(inventoryRecord);
    if (this.inventoryModalTitle == 'Add Inventory') {
      this.inventoryService.insertInventory(inventoryRecord).then(data => {
        console.log("inserted");
        this.getAllInventories();
      }).catch(data => {
        console.log(data);
      });
    } else {
      inventoryRecord.status = inventoryRecord.statusSelect.value;
      inventoryRecord.inventoryId = this.inventoryId;
      console.log(inventoryRecord);
      this.inventoryService.updateInventory(inventoryRecord).then(data => {
        console.log("updated");
        this.getAllInventories();

      }).catch(data => {
        console.log(data);
      });
    }
    this.enableInventoryPopup = false;

  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(this.getInventoriesExport());
      const workbook = {Sheets: {'data': worksheet}, SheetNames: ['data']};
      const excelBuffer: any = xlsx.write(workbook, {bookType: 'xlsx', type: 'array'});
      this.saveAsExcelFile(excelBuffer, "Inventory");
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    import("file-saver").then(FileSaver => {
      let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      let EXCEL_EXTENSION = '.xlsx';
      const data: Blob = new Blob([buffer], {
        type: EXCEL_TYPE
      });
      FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    });
  }

  getInventoriesExport() {
    let inventories = [];
    for (let inventory of this.inventoryList) {
      let inv = {
        laptopSn: inventory.laptopSn,
        powerAdapterSn: inventory.powerAdapterSn,
        status: inventory.status

      }
      inventories.push(inv);
    }
    return inventories;
  }

  onAssignInventoryClicked(rowData) {
    this.inventoryAssignForm.reset();
    this.inventoryRepairForm.reset();
    this.inventoryHistoryForm.reset();
    console.log(rowData);
    this.inventoryId = rowData.inventoryId;
    this.assignedStudent = {netId: '', lastName: '', firstName: '', email: ''};
    this.studentService.getStudentByInventoryId(this.inventoryId).then(data => {
      console.log(data);
      if (data['student'] != null) {
        this.assignedStudent = data['student'];
      }
      this.enableInventoryManagement = true;
    }).catch(data => {
      console.log(data);
    });

    this.getInventoryHistory();
  }

  private getInventoryHistory() {
    this.inventoryService.getAllInventoryHistory(this.inventoryId).then(data => {
      this.inventoryHistoryList = data["inventoryHistoryList"];
      console.log(this.inventoryHistoryList);
    }).catch(data => {
      console.log(data);
    });
  }

  onDeleteInventoryClicked() {
    this.enableInventoryDeletePopup = true
  }

  deleteInventory() {
    const inventoryRecord = {
      inventoryId: this.inventoryId,
    };
    this.inventoryService.deactivateInventory(inventoryRecord).then(data => {
      console.log("updated");
      this.getAllInventories();
      this.enableInventoryDeletePopup = false;
      this.enableInventoryPopup = false;
    }).catch(data => {
      console.log(data);
    });
  }

  updateInventoryHistory() {
    const inventoryRecord = Object.assign({}, this.inventoryHistoryForm.value);
    inventoryRecord.inventoryId = this.inventoryId
    this.inventoryService.updateInventoryHistory(inventoryRecord).then(data => {
      this.messageService.add({severity: 'success', summary: 'Success', detail: 'Inventory Notes added'});
      this.getInventoryHistory();
      this.inventoryHistoryForm.reset();
    }).catch(data => {
      console.log(data);
    });
  }


  onInventoryAssignNewStudentClicked() {
    this.enableInventoryRepair = false;
    //get spare inventory list
    this.studentService.getAllStudents().then(data => {
      console.log(data["studentList"]);
      const stdList = data["studentList"];
      this.studentList = [];

      for (let std of stdList) {
        std.label = std.lastName + ', ' + std.firstName + ' - ' + std.netId;
        std.value = std;
        this.studentList.push(std);
      }
      console.log(this.studentList);
      this.enableInventoryAssignment = true;

    }).catch(error => {
      console.log(error)
    });
  }


  onInventoryAssignNewStudentSaved() {
    const studentRecord = Object.assign({}, this.inventoryAssignForm.value);
    console.log(studentRecord);
    const input = {
      inventoryId: this.inventoryId,
      studentId: studentRecord.student.studentId
    }
    this.assignInventory(input);
    this.assignedStudent = studentRecord['student'];
    this.messageService.add({severity: 'success', summary: 'Success', detail: 'Laptop Assigned'});

  }

  onCloseAssignPopUpClicked() {
    this.getAllInventories();
    this.enableInventoryManagement = false;

  }

  assignInventory(data) {
    this.studentService.assignInventory(data).then(r => {
      this.getInventoryHistory();
    });
  }

  onInventoryRepairClicked() {
    this.enableInventoryRepair = true;
    this.enableInventoryAssignment = false;

  }

  onInventoryRepairSaved() {
    const inventoryRecord = Object.assign({}, this.inventoryRepairForm.value);
    console.log(this.assignedStudent);
    inventoryRecord.inventoryId = this.inventoryId;
    inventoryRecord.status = 'IN_REPAIR';
    inventoryRecord.studentId = this.assignedStudent['studentId'];

    console.log(inventoryRecord);

    this.inventoryService.repairInventory(inventoryRecord).then(data => {
      this.assignedStudent = {netId: '', lastName: '', firstName: '', email: ''};
      this.getInventoryHistory();
      this.inventoryRepairForm.reset();
      this.messageService.add({severity: 'success', summary: 'Success', detail: 'Inventory Updated'});
    }).catch(data => {
      console.log(data);
    });
  }

  uploadedFiles: File[] = [];
  file: any;

  onFileChange(event) {
    if (event.target.files.length > 0) {
      this.uploadedFiles = event.target.files;
      this.file = event.target.files[0];
      console.log(this.file);
      // this.form.get('file').setValue(file);
    }
  }

  onUpload() {
    this.processMessage = "Processing..."
    const reader: FileReader = new FileReader();
    reader.readAsBinaryString(this.file);
    reader.onload = (e: any) => {
      /* create workbook */
      const binarystr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(binarystr, {type: 'binary'});

      /* selected the first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* save data */
      const data = XLSX.utils.sheet_to_json(ws); // to get 2d array pass 2nd parameter as object {header: 1}
      // console.log(data); // Data will be logged in array format containing objects
      // data.forEach(data =>{
      this.inventoryService.insertInventoryFromUpload(data).then(data => {
        this.getAllInventories();
        this.messageService.add({severity: 'success', summary: 'Success', detail: 'Uploaded Successfully'});
        this.processMessage = "Data processed successfully"
      }).catch(data => {
        console.log(data);
      });
      // })

    };
  }

  onCloseUpload() {
    this.processMessage = null;
    this.enableUploadForm = false;
  }
}
