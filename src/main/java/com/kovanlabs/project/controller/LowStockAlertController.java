package com.kovanlabs.project.controller;

import com.kovanlabs.project.model.LowStockAlert;
import com.kovanlabs.project.service.LowStockAlertService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class LowStockAlertController {

    private final LowStockAlertService lowStockAlertService;

    public LowStockAlertController(LowStockAlertService lowStockAlertService) {
        this.lowStockAlertService = lowStockAlertService;
    }

    @GetMapping("/owner/open")
    public List<LowStockAlert> ownerOpen() {
        return Collections.emptyList();
    }

    @GetMapping("/manager/open")
    public List<LowStockAlert> managerOpen() {
        return Collections.emptyList();
    }
}
