!include WinMessages.nsh

!ifndef BUILD_UNINSTALLER
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Install ${PRODUCT_NAME}"
  !define MUI_WELCOMEPAGE_TEXT "Install ${PRODUCT_NAME} for your Windows account.$\r$\n$\r$\nClick Install to continue."
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW GradeWelcomeShow
  !insertmacro MUI_PAGE_WELCOME
!macroend

Function GradeWelcomeShow
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Install"
FunctionEnd
!endif

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
